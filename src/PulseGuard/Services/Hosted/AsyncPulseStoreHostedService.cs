using Microsoft.Extensions.Options;
using PulseGuard.Models;

namespace PulseGuard.Services.Hosted;

public class AsyncPulseStoreHostedService(AsyncPulseStoreService storeClient, SignalService signalService, IServiceProvider services, IOptions<PulseOptions> options, ILogger<AsyncPulseStoreHostedService> logger) : BackgroundService
{
    private readonly AsyncPulseStoreService _storeClient = storeClient;
    private readonly SignalService _signalService = signalService;
    private readonly IServiceProvider _services = services;
    private readonly int _cleaningInterval = options.Value.CleaningInterval;
    private readonly ILogger<AsyncPulseStoreHostedService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        int count = 1;
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _signalService.WaitAsync(stoppingToken);
                count = await Handle(count, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Pulses, ex, "Error checking pulses");
            }
        }
    }

    private async Task<int> Handle(int count, CancellationToken cancellationToken)
    {
        using IServiceScope scope = _services.CreateScope();
        PulseStore store = scope.ServiceProvider.GetRequiredService<PulseStore>();

        if (count++ >= _cleaningInterval)
        {
            await store.CleanRecent(cancellationToken);
            await Task.Delay(500, cancellationToken);
            count = 1;
        }

        await foreach (PulseEventMessage message in _storeClient.ReceiveMessagesAsync(cancellationToken))
        {
            try
            {
                if (message.PulseEvent is not null)
                {
                    await store.StoreAsync(message.PulseEvent.Report, message.Created, message.PulseEvent.ElapsedMilliseconds, cancellationToken);
                }

                await _storeClient.DeleteMessageAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Pulses, ex, "Error storing pulses for message {id}", message.Id);
            }
        }

        await foreach (PulseAgentEventMessage message in _storeClient.ReceiveAgentMessagesAsync(cancellationToken))
        {
            try
            {
                if (message.AgentReport is not null)
                {
                    switch (message.AgentReport)
                    {
                        case PulseAgentReport pulseAgentReport:
                            await store.StoreAsync(pulseAgentReport, message.Created, cancellationToken);
                            break;

                        case DeploymentAgentReport deploymentAgentReport:
                            await store.StoreAsync(deploymentAgentReport, cancellationToken);
                            break;

                        default:
                            _logger.LogWarning(PulseEventIds.Pulses, "Unknown agent report type for message {id}: {type}", message.Id, message.AgentReport?.GetType());
                            break;
                    }
                }

                await _storeClient.DeleteMessageAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Pulses, ex, "Error storing pulses for message {id}", message.Id);
            }
        }

        return count;
    }
}
