using PulseGuard.Entities;

namespace PulseGuard.Models;

public sealed record HealthQueryDetail(string? Group, string? Name, PulseStates State, long? LastElapsedMilliseconds)
{
    public static HealthQueryDetail Missing => new(null, null, PulseStates.Unknown, null);
}
