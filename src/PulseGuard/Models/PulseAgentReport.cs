using PulseGuard.Entities;

namespace PulseGuard.Models;

public sealed record PulseAgentReport(PulseAgentConfiguration Options, double? CpuPercentage, double? Memory, double? InputOutput)
{
    public static PulseAgentReport Fail(PulseAgentConfiguration options) => new(options, null, null, null);
    public static IReadOnlyList<PulseAgentReport> Fail(IReadOnlyList<PulseAgentConfiguration> options) => [.. options.Select(Fail)];
}