namespace PulseGuard.Models;

public enum PulseStates
{
    Unknown,
    Healthy,
    Degraded,
    Unhealthy
}

internal static class PulseStatesFastString
{
    public static string Stringify(this PulseStates state) => state switch
    {
        PulseStates.Unknown => nameof(PulseStates.Unknown),
        PulseStates.Healthy => nameof(PulseStates.Healthy),
        PulseStates.Degraded => nameof(PulseStates.Degraded),
        PulseStates.Unhealthy => nameof(PulseStates.Unhealthy),
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseStates FromString(string state) => state switch
    {
        nameof(PulseStates.Unknown) => PulseStates.Unknown,
        nameof(PulseStates.Healthy) => PulseStates.Healthy,
        nameof(PulseStates.Degraded) => PulseStates.Degraded,
        nameof(PulseStates.Unhealthy) => PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };
}