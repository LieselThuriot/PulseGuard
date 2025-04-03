using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "IdentifierType", RowKey = "Id")]
public sealed partial class UniqueIdentifiers
{
    public const string PartitionPulseConfiguration = nameof(PulseConfiguration);
}
