namespace PulseGuard.Models;

public sealed record PulseEvent(long ElapsedMilliseconds, PulseReport Report);
