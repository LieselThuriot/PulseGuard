namespace PulseGuard.Services;

public sealed class SignalService
{
    private const int ServicesToSignal = 2;

    private readonly SemaphoreSlim _semaphore = new(ServicesToSignal, ServicesToSignal);

    public void Signal()
    {
        int permitsToRelease = ServicesToSignal - _semaphore.CurrentCount;
        if (permitsToRelease > 0)
        {
            _semaphore.Release(permitsToRelease);
        }
    }

    public Task WaitAsync(CancellationToken token) => _semaphore.WaitAsync(token);
}
