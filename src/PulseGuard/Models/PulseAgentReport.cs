using PulseGuard.Entities;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace PulseGuard.Models;

[JsonPolymorphic]
[JsonDerivedType(typeof(PulseAgentReport), "Metrics")]
[JsonDerivedType(typeof(DeploymentAgentReport), "Deployments")]
public abstract record AgentReport(PulseAgentConfiguration Options)
{
    public abstract JsonTypeInfo GetTypeInfo();
}

public sealed record PulseAgentReport(PulseAgentConfiguration Options, double? CpuPercentage, double? Memory, double? InputOutput) : AgentReport(Options)
{
    public override JsonTypeInfo GetTypeInfo() => PulseSerializerContext.Default.PulseAgentReport;
    public static PulseAgentReport Fail(PulseAgentConfiguration options) => new(options, null, null, null);

    public static IReadOnlyList<PulseAgentReport> Fail(IReadOnlyList<PulseAgentConfiguration> options) => [.. options.Select(Fail)];
}

public sealed record DeploymentAgentReport(PulseAgentConfiguration Options, string Author, string Status, DateTimeOffset Start, DateTimeOffset End, string? Type, string? CommitId, string? BuildNumber) : AgentReport(Options)
{
    public override JsonTypeInfo GetTypeInfo() => PulseSerializerContext.Default.DeploymentAgentReport;
}