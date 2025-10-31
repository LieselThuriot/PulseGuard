using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Counter), RowKey = nameof(Sqid))]
public partial class PulseCounter
{
    public const string FailCounter = "FailCounter";

    public partial string Counter { get; set; }
    public partial string Sqid { get; set; }

    public partial int Value { get; set; }
}