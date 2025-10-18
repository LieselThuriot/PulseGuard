using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(UserId), RowKey = nameof(RowType))]
public sealed partial class User
{
    public const string RowTypeRoles = "Roles";

    public partial string UserId { get; set; }
    public partial string RowType { get; set; }
    public partial string Value { get; set; }
}
