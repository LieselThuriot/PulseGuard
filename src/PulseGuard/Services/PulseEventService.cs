using PulseGuard.Models;

namespace PulseGuard.Services;

public interface IPulseListener
{
    public void OnPulse(PulseEventInfo pulse);
}

public interface IPulseEventService
{
    public void Notify(string id, string group, string name, PulseStates state, DateTimeOffset creation, long elapsedMilliseconds);
}

public interface IPulseRegistrationService
{
    public IDisposable Listen(IPulseListener listener);
}

public sealed class PulseEventService : IPulseEventService, IPulseRegistrationService
{
    private readonly Lock _lock = new();
    private readonly List<IPulseListener> _listeners = [];

    public void Notify(string id, string group, string name, PulseStates state, DateTimeOffset creation, long elapsedMilliseconds)
    {
        if (_listeners.Count is 0)
        {
            return;
        }

        PulseEventInfo info = new(id, group, name, state, creation, elapsedMilliseconds);

        lock (_lock)
        {
            foreach (IPulseListener listener in _listeners)
            {
                try
                {
                    listener.OnPulse(info);
                }
                catch (Exception ex)
                {
                    // Handle exception if needed
                    Console.WriteLine($"Error notifying listener: {ex.Message}");
                }
            }
        }
    }

    public IDisposable Listen(IPulseListener listener)
    {
        ArgumentNullException.ThrowIfNull(listener);

        lock (_lock)
        {
            _listeners.Add(listener);
        }

        return new ListenerHandle(_lock, _listeners, listener);
    }

    private sealed class ListenerHandle(Lock @lock, List<IPulseListener> listeners, IPulseListener listener) : IDisposable
    {
        private readonly Lock _lock = @lock;
        private readonly List<IPulseListener> _listeners = listeners;
        private readonly IPulseListener _listener = listener;

        public void Dispose()
        {
            lock (_lock)
            {
                _listeners.Remove(_listener);
            }
        }
    }
}