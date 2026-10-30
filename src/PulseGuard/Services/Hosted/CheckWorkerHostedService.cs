using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Services.Hosted;

/// <summary>
/// Runs on every instance and executes check jobs from the shared check queue.
/// A job that fails is not retried: its message stays hidden for the interval and then expires.
/// </summary>
public sealed class CheckWorkerHostedService(CheckJobQueue jobs, IServiceProvider services, IOptions<PulseOptions> options, ILogger<CheckWorkerHostedService> logger) : BackgroundService
{
    private readonly CheckJobQueue _jobs = jobs;
    private readonly IServiceProvider _services = services;
    private readonly PulseOptions _options = options.Value;
    private readonly ILogger<CheckWorkerHostedService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _jobs.InitializeAsync(stoppingToken);

        TimeSpan visibilityTimeout = TimeSpan.FromMinutes(_options.Interval);
        TimeSpan pollingInterval = TimeSpan.FromSeconds(_options.QueuePollingSeconds);
        // Not disposed: running jobs may still release a slot after shutdown
        SemaphoreSlim slots = new(_options.SimultaneousPulses);

        while (!stoppingToken.IsCancellationRequested)
        {
            // Only receive a message when there is capacity to execute it
            await slots.WaitAsync(stoppingToken);

            CheckJobMessage? message;
            try
            {
                message = await _jobs.ReceiveAsync(visibilityTimeout, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.ErrorReceivingCheckJobs(ex);
                message = null;
            }

            if (message is null)
            {
                slots.Release();
                await Task.Delay(pollingInterval, stoppingToken);
                continue;
            }

            _ = Task.Run(async () =>
            {
                try
                {
                    await ProcessAsync(message.Value, stoppingToken);
                }
                finally
                {
                    slots.Release();
                }
            }, CancellationToken.None);
        }
    }

    private async Task ProcessAsync(CheckJobMessage message, CancellationToken stoppingToken)
    {
        using CancellationTokenSource cts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
        cts.CancelAfter(TimeSpan.FromMinutes(_options.Interval) - TimeSpan.FromSeconds(5));

        try
        {
            if (message.Job is not null)
            {
                await ExecuteAsync(message.Job, cts.Token);
            }

            await _jobs.DeleteAsync(message);
            PulseMetrics.RecordJobProcessed("completed");
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            PulseMetrics.RecordJobProcessed("released");
            await ReleaseAsync(message);
        }
        catch (OperationCanceledException ex)
        {
            // Exceeded the interval: the job is stale, so drop it
            PulseMetrics.RecordJobProcessed("expired");
            _logger.ErrorProcessingCheckJob(ex, message.MessageId);
            await DeleteAsync(message);
        }
        catch (Exception ex)
        {
            PulseMetrics.RecordJobProcessed("failed");
            _logger.ErrorProcessingCheckJob(ex, message.MessageId);
        }
    }

    private async Task ReleaseAsync(CheckJobMessage message)
    {
        try
        {
            await _jobs.ReleaseAsync(message);
        }
        catch (Exception ex)
        {
            _logger.ErrorProcessingCheckJob(ex, message.MessageId);
        }
    }

    private async Task DeleteAsync(CheckJobMessage message)
    {
        try
        {
            await _jobs.DeleteAsync(message);
        }
        catch (Exception ex)
        {
            _logger.ErrorProcessingCheckJob(ex, message.MessageId);
        }
    }

    private async Task ExecuteAsync(CheckJob job, CancellationToken token)
    {
        using IServiceScope scope = _services.CreateScope();
        PulseContext context = scope.ServiceProvider.GetRequiredService<PulseContext>();
        PulseCheckExecutor executor = scope.ServiceProvider.GetRequiredService<PulseCheckExecutor>();

        if (job.Kind is CheckJobKind.Pulse)
        {
            CheckJobTarget target = job.Targets[0];
            PulseConfiguration? config = await context.Configurations.FindAsync(target.PartitionKey, target.RowKey, token);
            if (config is not { Enabled: true } || string.IsNullOrEmpty(config.Sqid))
            {
                return;
            }

            UniqueIdentifier? identifier = await context.Settings.FindUniqueIdentifierAsync(config.Sqid, token);
            if (identifier is not null)
            {
                config.Group = identifier.Group;
                config.Name = identifier.Name;
            }

            await executor.ExecuteAsync(config, token);
        }
        else
        {
            List<PulseAgentConfiguration> configs = new(job.Targets.Count);
            foreach (CheckJobTarget target in job.Targets)
            {
                PulseAgentConfiguration? config = await context.AgentConfigurations.FindAsync(target.PartitionKey, target.RowKey, token);
                if (config is { Enabled: true })
                {
                    configs.Add(config);
                }
            }

            if (configs.Count > 0)
            {
                await executor.ExecuteAsync(job.AgentType, configs, token);
            }
        }
    }
}
