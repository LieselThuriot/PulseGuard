using TableStorage;

namespace PulseGuard.Entities;

[TableContext]
public sealed partial class PulseContext
{
    internal const int RecentMinutes = 720;

    public TableSet<User> Users { get; }
    public TableSet<PulseConfiguration> Configurations { get; }
    public TableSet<PulseAgentConfiguration> AgentConfigurations { get; }
    public TableSet<Pulse> Pulses { get; }
    public TableSet<UniqueIdentifier> UniqueIdentifiers { get; }
    public TableSet<Webhook> Webhooks { get; }

    /// <summary>
    /// Duplication of last results in the default timeframe
    /// </summary>
    public TableSet<Pulse> RecentPulses { get; }

    public AppendBlobSet<PulseCheckResult> PulseCheckResults { get; }
    public BlobSet<ArchivedPulseCheckResult> ArchivedPulseCheckResults { get; }

    public AppendBlobSet<PulseAgentCheckResult> PulseAgentResults { get; }
    public BlobSet<ArchivedPulseAgentCheckResult> ArchivedPulseAgentResults { get; }

    public TableSet<DeploymentResult> Deployments { get; }

    public TableSet<PulseCounter> PulseCounters { get; }
}
