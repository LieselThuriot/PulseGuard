using Microsoft.Extensions.Options;
using PulseGuard.Agents;
using PulseGuard.Checks;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Configuration;
using System.Diagnostics;
using System.Net.Sockets;
using TableStorage.Linq;

namespace PulseGuard.Services.Hosted;

public sealed class PulseHostedService(IServiceProvider services, SignalService signalService, IOptionsMonitor<PulseOptions> options, ILogger<PulseHostedService> logger) : BackgroundService
{
    private readonly IServiceProvider _services = services;
    private readonly SignalService _signalService = signalService;
    private readonly IOptionsMonitor<PulseOptions> _options = options;
    private readonly ILogger<PulseHostedService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            int interval = _options.CurrentValue.Interval;

            DateTime now = DateTime.UtcNow;
            DateTime next = new(now.Year, now.Month, now.Day, now.Hour, 0, 0);
            next = next.AddMinutes(((now.Minute / interval) + 1) * interval);
            await Task.Delay(next - now, stoppingToken);

            try
            {
                TimeSpan maxExecution = TimeSpan.FromMinutes(interval) - TimeSpan.FromSeconds(5);
                using CancellationTokenSource cts = new(maxExecution);
                await CheckPulseAsync(cts.Token);
                _signalService.Signal();
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.HealthChecks, ex, "Error checking pulse");
            }
        }
    }

    private async Task CheckPulseAsync(CancellationToken token)
    {
        using var scope = _services.CreateScope();

        var context = scope.ServiceProvider.GetRequiredService<PulseContext>();

        var configurations = await context.Configurations.Where(c => c.Enabled).ToListAsync(token);
        var agentConfigurations = await context.AgentConfigurations.Where(c => c.Enabled).ToListAsync(token);

        var store = scope.ServiceProvider.GetRequiredService<AsyncPulseStoreService>();
        var factory = scope.ServiceProvider.GetRequiredService<PulseCheckFactory>();
        var agentFactory = scope.ServiceProvider.GetRequiredService<AgentCheckFactory>();

        int simultaneousPulses = _options.CurrentValue.SimultaneousPulses;
        using SemaphoreSlim semaphore = new(simultaneousPulses, simultaneousPulses); // rate gate

        var identifiers = await context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration)
                                       .SelectFields(x => new { x.Id, x.Group, x.Name })
                                       .ToDictionaryAsync(x => x.Id, x => (x.Group, x.Name), cancellationToken: token);

        List<Task> checks = new(configurations.Count + agentConfigurations.Count);

        foreach (var configuration in configurations)
        {
            checks.Add(Task.Run(() => CheckPulse(configuration), token));
        }

        foreach (var configurationGroup in agentConfigurations.GroupBy(x => x.Type))
        {
            foreach (var locationConfigurationGroup in configurationGroup.GroupBy(x => x.Location))
            {
                checks.Add(Task.Run(() => CheckAgent(configurationGroup.Key, [.. locationConfigurationGroup]), token));
            }
        }

        await Task.WhenAll(checks);

        async Task CheckPulse(PulseConfiguration config)
        {
            try
            {
                await semaphore.WaitAsync(token);

                if (identifiers.TryGetValue(config.Sqid, out var identifier))
                {
                    config.Group = identifier.Group;
                    config.Name = identifier.Name;
                }

                PulseCheck check = factory.Create(config);
                await CheckPulseAsync(check, store, token);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.HealthChecks, ex, "Error checking pulse");
            }
            finally
            {
                semaphore.Release();
            }
        }

        async Task CheckAgent(string type, IReadOnlyList<PulseAgentConfiguration> configs)
        {
            try
            {
                await semaphore.WaitAsync(token);

                AgentCheck check = agentFactory.Create(type, configs);
                await CheckPulseAsync(check, store, token);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.HealthChecks, ex, "Error checking agent");
            }
            finally
            {
                semaphore.Release();
            }
        }
    }

    private async Task CheckPulseAsync(AgentCheck check, AsyncPulseStoreService store, CancellationToken token)
    {
        try
        {
            IReadOnlyList<PulseAgentReport> reports = await check.CheckAsync(token);
            await store.PostAsync(reports, token);
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "Agent timeout");
        }
        catch (SocketException ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "Socket error checking agent");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "HTTP Error checking agent");
        }
        catch (Exception ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "Error checking agent");
        }
    }

    private async Task CheckPulseAsync(PulseCheck check, AsyncPulseStoreService store, CancellationToken token)
    {
        PulseReport? report = null;

        var sw = Stopwatch.StartNew();
        bool success = false;

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(token);
            cts.CancelAfter(check.Options.Timeout);

            report = await check.CheckAsync(cts.Token);

            sw.Stop();

            report = PostProcessReport(report, sw);
            success = true;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "Pulse timeout");
            report = PulseReport.TimedOut(check.Options);
        }
        catch (SocketException ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "Socket error checking pulse");
            report = PulseReport.Fail(check.Options, "Pulse check failed due to socket exception", ex.Message);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "HTTP Error checking pulse");

            string error = ex.Message;
            if (ex.InnerException?.Message is not null)
            {
                error = $"{error.TrimEnd('.', ' ')}: {ex.InnerException.Message.TrimEnd('.', ' ')}";
            }

            report = PulseReport.Fail(check.Options, "Pulse check failed due to http request exception", error);
        }
        catch (Exception ex)
        {
            _logger.LogError(PulseEventIds.HealthChecks, ex, "Error checking pulse");
            report = PulseReport.Fail(check.Options, "Pulse check failed due to exception", ex.Message);
        }
        finally
        {
            if (report is not null)
            {
                long elapsedMilliseconds = success ? sw.ElapsedMilliseconds : check.Options.Timeout;
                await store.PostAsync(report, elapsedMilliseconds, token);
            }
        }
    }

    private static PulseReport PostProcessReport(PulseReport report, Stopwatch sw)
    {
        if (report.State is PulseStates.Healthy)
        {
            int? degrationTimeout = report.Options.DegrationTimeout;
            if (degrationTimeout.HasValue && sw.ElapsedMilliseconds > degrationTimeout.GetValueOrDefault())
            {
                return report with
                {
                    State = PulseStates.Degraded,
                    Message = $"Pulse check took longer than the expected {degrationTimeout.GetValueOrDefault()}ms",
                    Error = $"Pulse degraded because it took {sw.ElapsedMilliseconds}ms to complete"
                };
            }
        }

        return report;
    }
}