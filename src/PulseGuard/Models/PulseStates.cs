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
        PulseStates.Unknown => "Unknown",
        PulseStates.Healthy => "Healthy",
        PulseStates.Degraded => "Degraded",
        PulseStates.Unhealthy => "Unhealthy",
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };
}