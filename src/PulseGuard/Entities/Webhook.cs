using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "Secret", RowKey = "EntryNumber")]
public sealed partial class Webhook
{
    public partial string Secret { get; set; }
    public partial string EntryNumber { get; set; }
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial string Location { get; set; }
    public partial bool Enabled { get; set; }
}
