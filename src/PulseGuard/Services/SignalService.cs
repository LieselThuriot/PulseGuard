namespace PulseGuard.Services;

public sealed class SignalService : IDisposable
{
    private const int ServicesToSignal = 2;

    private readonly SemaphoreSlim _semaphore = new(ServicesToSignal, ServicesToSignal);

    public void Dispose() => _semaphore.Dispose();

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
