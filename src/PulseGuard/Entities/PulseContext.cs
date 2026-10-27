using TableStorage;
using TableStorage.Fluent;

namespace PulseGuard.Entities;

[TableContext]
public sealed partial class PulseContext
{
    internal const int RecentMinutes = 720;

    public TableSet<FluentPartitionTableEntity<UniqueIdentifier, User, PulseApiKey>> Settings { get; set; }

    /// <summary>
    /// Frequently updated runtime state
    /// </summary>
    public TableSet<FluentPartitionTableEntity<FailCounter, IntervalClaim>> State { get; set; }

    public TableSet<FluentPartitionTableEntity<OAuth2Credentials, BasicCredentials, ApiKeyCredentials>> Credentials { get; set; }

    public TableSet<PulseConfiguration> Configurations { get; }
    public TableSet<PulseAgentConfiguration> AgentConfigurations { get; }

    public TableSet<Pulse> Pulses { get; }

    /// <summary>
    /// Duplication of last results in the default timeframe
    /// </summary>
    public TableSet<Pulse> RecentPulses { get; }
    public TableSet<Webhook> Webhooks { get; }

    public AppendBlobSet<PulseCheckResult> PulseCheckResults { get; }
    public BlobSet<ArchivedPulseCheckResult> ArchivedPulseCheckResults { get; }

    public AppendBlobSet<PulseAgentCheckResult> PulseAgentResults { get; }
    public BlobSet<ArchivedPulseAgentCheckResult> ArchivedPulseAgentResults { get; }

    public TableSet<DeploymentResult> Deployments { get; }

    public TableSet<Heatmap> Heatmaps { get; }
}