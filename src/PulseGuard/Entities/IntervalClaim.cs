using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Name))]
public sealed partial class IntervalClaim
{
    public partial string Name { get; set; }

    public partial DateTimeOffset Interval { get; set; }
}
