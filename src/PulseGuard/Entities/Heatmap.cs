using PulseGuard.Models;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Sqid), RowKey = nameof(Day))]
public sealed partial class Heatmap
{
    public partial string Sqid { get; set; }

    /// <summary>
    /// Day in yyyyMMdd format
    /// </summary>
    public partial string Day { get; set; }

    public partial int Unknown { get; set; }
    public partial int Healthy { get; set; }
    public partial int Degraded { get; set; }
    public partial int Unhealthy { get; set; }
    public partial int TimedOut { get; set; }

    public void Increment(PulseStates state)
    {
        switch (state)
        {
            case PulseStates.Unknown:
                Unknown++;
                break;
            case PulseStates.Healthy:
                Healthy++;
                break;
            case PulseStates.Degraded:
                Degraded++;
                break;
            case PulseStates.Unhealthy:
                Unhealthy++;
                break;
            case PulseStates.TimedOut:
                TimedOut++;
                break;
        }
    }
}