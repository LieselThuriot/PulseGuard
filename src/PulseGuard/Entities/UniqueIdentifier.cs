using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(IdentifierType), RowKey = nameof(Id))]
public sealed partial class UniqueIdentifier
{
    public const string PartitionPulseConfiguration = nameof(PulseConfiguration);

    public partial string IdentifierType { get; set; }
    public partial string Id { get; set; }

    public partial string Group { get; set; }
    public partial string Name { get; set; }
}
