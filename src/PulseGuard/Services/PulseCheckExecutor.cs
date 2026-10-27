using PulseGuard.Agents;
using PulseGuard.Checks;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Diagnostics;
using System.Net.Sockets;

namespace PulseGuard.Services;

/// <summary>
/// Executes a single pulse check or grouped agent check and stores the result.
/// </summary>
public sealed class PulseCheckExecutor(PulseStore store, AuthService authService, PulseCheckFactory factory, AgentCheckFactory agentFactory, ILogger<PulseCheckExecutor> logger)
{
    private readonly PulseStore _store = store;
    private readonly AuthService _authService = authService;
    private readonly PulseCheckFactory _factory = factory;
    private readonly AgentCheckFactory _agentFactory = agentFactory;
    private readonly ILogger<PulseCheckExecutor> _logger = logger;

    public async Task ExecuteAsync(PulseConfiguration config, CancellationToken token)
    {
        AuthHeader? auth = await _authService.GetAsync(config, token);
        PulseCheck check = _factory.Create(config, auth);

        PulseReport report;
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
        catch (OperationCanceledException) when (token.IsCancellationRequested)
        {
            throw;
        }
        catch (TaskCanceledException ex)
        {
            _logger.PulseTimeout(ex);
            report = PulseReport.TimedOut(check.Options);
        }
        catch (SocketException ex)
        {
            _logger.SocketErrorCheckingPulse(ex);
            report = PulseReport.Fail(check.Options, "Pulse check failed due to socket exception", ex.Message);
        }
        catch (HttpRequestException ex)
        {
            _logger.HttpErrorCheckingPulse(ex);

            string error = ex.Message;
            if (ex.InnerException?.Message is not null)
            {
                error = $"{error.TrimEnd('.', ' ')}: {ex.InnerException.Message.TrimEnd('.', ' ')}";
            }

            report = PulseReport.Fail(check.Options, "Pulse check failed due to http request exception", error);
        }
        catch (Exception ex)
        {
            _logger.ErrorCheckingPulse(ex);
            report = PulseReport.Fail(check.Options, "Pulse check failed due to exception", ex.Message);
        }

        long elapsedMilliseconds = success ? sw.ElapsedMilliseconds : check.Options.Timeout;
        await _store.StoreAsync(report, DateTimeOffset.UtcNow, elapsedMilliseconds, token);
    }

    public async Task ExecuteAsync(string type, IReadOnlyList<PulseAgentConfiguration> configs, CancellationToken token)
    {
        AuthHeader? auth = await _authService.GetAsync(configs[0], token); // Grouped by AuthenticationId
        IAgentCheck check = _agentFactory.Create(type, configs, auth);

        IReadOnlyList<AgentReport> reports;

        try
        {
            reports = await check.CheckAsync(token);
        }
        catch (OperationCanceledException) when (token.IsCancellationRequested)
        {
            throw;
        }
        catch (TaskCanceledException ex)
        {
            _logger.AgentTimeout(ex);
            return;
        }
        catch (SocketException ex)
        {
            _logger.SocketErrorCheckingAgent(ex);
            return;
        }
        catch (HttpRequestException ex)
        {
            _logger.HttpErrorCheckingAgent(ex);
            return;
        }
        catch (Exception ex)
        {
            _logger.ErrorCheckingAgent(ex);
            return;
        }

        DateTimeOffset creation = DateTimeOffset.UtcNow;
        foreach (AgentReport report in reports)
        {
            try
            {
                switch (report)
                {
                    case PulseAgentReport pulseAgentReport:
                        await _store.StoreAsync(pulseAgentReport, creation, token);
                        break;

                    case DeploymentAgentReport deploymentAgentReport:
                        await _store.StoreAsync(deploymentAgentReport, token);
                        break;
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.ErrorStoringAgentReport(ex, report.Options.Sqid, type);
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
