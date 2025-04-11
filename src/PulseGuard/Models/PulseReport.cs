using ProtoBuf;
using PulseGuard.Entities;

namespace PulseGuard.Models;

[ProtoContract(SkipConstructor = true)]
public sealed record PulseReport(
    [property: ProtoMember(1)] PulseConfiguration Options,
    [property: ProtoMember(2)] PulseStates State,
    [property: ProtoMember(3)] string Message,
    [property: ProtoMember(4)] string? Error)
{
    internal const string HealthyMessage = "Pulse check succeeded";

    public static PulseReport Success(PulseConfiguration options) => new(options, PulseStates.Healthy, HealthyMessage, null);
    public static PulseReport Fail(PulseConfiguration options, string message, string? error) => new(options, PulseStates.Unhealthy, message, error);
};
