namespace PulseGuard.Models;

public sealed record PulseEventInfo(string Id, string Group, string Name, PulseStates State, DateTimeOffset Creation, long ElapsedMilliseconds);
