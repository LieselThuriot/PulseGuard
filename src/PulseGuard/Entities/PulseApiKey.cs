using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(KeyHash))]
public sealed partial class PulseApiKey
{
    public partial string KeyHash { get; set; }
    public partial string Id { get; set; }
    public partial string Label { get; set; }
    public partial DateTimeOffset Created { get; set; }
    public partial int? ValidFor { get; set; }
}
