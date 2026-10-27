using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Services.Hosted;

/// <summary>
/// Runs on every instance. Each interval one instance claims the tick and queues one check job per pulse (and per agent group),
/// which are executed by every instance via <see cref="CheckWorkerHostedService"/>. The same instance also runs the periodic cleanup.
/// </summary>
public sealed class PulseHostedService(IServiceProvider services, CheckJobQueue jobs, IOptionsMonitor<PulseOptions> options, ILogger<PulseHostedService> logger) : BackgroundService
{
    private readonly IServiceProvider _services = services;
    private readonly CheckJobQueue _jobs = jobs;
    private readonly IOptionsMonitor<PulseOptions> _options = options;
    private readonly ILogger<PulseHostedService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _jobs.InitializeAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            PulseOptions options = _options.CurrentValue;
            int interval = options.Interval;

            DateTime now = DateTime.UtcNow;
            DateTime next = new(now.Year, now.Month, now.Day, now.Hour, 0, 0, DateTimeKind.Utc);
            next = next.AddMinutes(((now.Minute / interval) + 1) * interval);
            await Task.Delay(next - now, stoppingToken);

            try
            {
                using IServiceScope scope = _services.CreateScope();

                if (!await scope.ServiceProvider.GetRequiredService<IntervalClaimService>().TryClaimAsync("schedule", next, stoppingToken))
                {
                    continue;
                }

                await ScheduleAsync(scope.ServiceProvider.GetRequiredService<PulseContext>(), TimeSpan.FromMinutes(interval), stoppingToken);

                long tick = new DateTimeOffset(next).ToUnixTimeSeconds() / 60 / interval;
                if (tick % options.CleaningInterval is 0)
                {
                    await scope.ServiceProvider.GetRequiredService<PulseStore>().CleanRecent(stoppingToken);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.ErrorSchedulingCheckJobs(ex);
            }
        }
    }

    private async Task ScheduleAsync(PulseContext context, TimeSpan timeToLive, CancellationToken token)
    {
        var configurations = await context.Configurations.Where(c => c.Enabled).ToListAsync(token);
        var agentConfigurations = await context.AgentConfigurations.Where(c => c.Enabled).ToListAsync(token);

        List<CheckJob> jobs = [.. configurations.Select(x => new CheckJob(CheckJobKind.Pulse, "", [new(x.Group, x.Name)]))];

        foreach (var configurationGroup in agentConfigurations.GroupBy(x => x.Type))
        {
            foreach (var locationGroup in configurationGroup.GroupBy(x => (x.Location, x.AuthenticationId ?? "")))
            {
                jobs.Add(new CheckJob(CheckJobKind.Agent, configurationGroup.Key, [.. locationGroup.Select(x => new CheckJobTarget(x.Sqid, x.Type))]));
            }
        }

        await Parallel.ForEachAsync(jobs, new ParallelOptions { MaxDegreeOfParallelism = 16, CancellationToken = token }, async (job, ct) =>
        {
            try
            {
                await _jobs.SendAsync(job, timeToLive, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.ErrorSendingCheckJob(ex, job.Targets[0].PartitionKey, job.Targets[0].RowKey);
            }
        });

        _logger.ScheduledCheckJobs(jobs.Count);
    }
}
