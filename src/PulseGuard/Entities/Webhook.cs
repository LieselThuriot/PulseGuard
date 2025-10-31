using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Id), RowKey = nameof(Secret))]
public sealed partial class Webhook
{
    public partial string Id { get; set; }
    public partial string Secret { get; set; }
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial string Location { get; set; }
    public partial bool Enabled { get; set; }
    public partial bool SendAllChanges { get; set; }
}
