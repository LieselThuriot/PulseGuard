using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Sqid))]
public partial class FailCounter
{
    public partial string Sqid { get; set; }

    public partial int Value { get; set; }
}