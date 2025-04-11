using Microsoft.Extensions.Options;
using PulseGuard.Models;
using System.Diagnostics;

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

        await foreach ((string messageId, string popReceipt, PulseEvent? pulseEvent) in _storeClient.ReceiveMessagesAsync(cancellationToken))
        {
            try
            {
                Debug.Assert(pulseEvent is not null);
                await store.StoreAsync(pulseEvent.Report, pulseEvent.ElapsedMilliseconds, cancellationToken);
                await _storeClient.DeleteMessageAsync(messageId, popReceipt);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Pulses, ex, "Error storing pulses for message {id}", messageId);
            }
        }

        if (count < _cleaningInterval)
        {
            return count + 1;
        }

        await store.CleanRecent(cancellationToken);
        return 1;
    }
}
