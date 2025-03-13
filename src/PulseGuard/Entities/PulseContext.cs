using TableStorage;

namespace PulseGuard.Entities;

[TableContext]
public sealed partial class PulseContext
{
    internal const int RecentMinutes = 720;
    internal const int RecentDays = 14;

    public TableSet<PulseConfiguration> Configurations { get; }
    public TableSet<Pulse> Pulses { get; }
    public TableSet<UniqueIdentifiers> UniqueIdentifiers { get; }
    public TableSet<Webhook> Webhooks { get; }

    /// <summary>
    /// Duplication of last results in the default timeframe
    /// </summary>
    public TableSet<Pulse> RecentPulses { get; }

    public AppendBlobSet<PulseCheckResult> PulseCheckResults { get; } //TODO: Blobs with appending results
}