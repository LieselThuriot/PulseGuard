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

    public static int Numberify(this PulseStates state) => state switch
    {
        PulseStates.Unknown => (int)PulseStates.Unknown,
        PulseStates.Healthy => (int)PulseStates.Healthy,
        PulseStates.Degraded => (int)PulseStates.Degraded,
        PulseStates.Unhealthy => (int)PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseStates FromNumber(int state) => state switch
    {
        (int)PulseStates.Unknown => PulseStates.Unknown,
        (int)PulseStates.Healthy => PulseStates.Healthy,
        (int)PulseStates.Degraded => PulseStates.Degraded,
        (int)PulseStates.Unhealthy => PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseStates FromNumber(string state) => state switch
    {
        "0" => PulseStates.Unknown,
        "1" => PulseStates.Healthy,
        "2" => PulseStates.Degraded,
        "3" => PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };
}