using ProtoBuf;
using PulseGuard.Entities;

namespace PulseGuard.Models;

public sealed record PulseReport(PulseConfiguration Options, PulseStates State, string Message, string? Error)
{
    internal const string HealthyMessage = "Pulse check succeeded";

    public static PulseReport Success(PulseConfiguration options) => new(options, PulseStates.Healthy, HealthyMessage, null);
    public static PulseReport Fail(PulseConfiguration options, string message, string? error) => new(options, PulseStates.Unhealthy, message, error);
    public static PulseReport TimedOut(PulseConfiguration options) => new(options, PulseStates.TimedOut, "Pulse check failed due timeout", $"Pulse timed out after {options.Timeout}ms");
};
