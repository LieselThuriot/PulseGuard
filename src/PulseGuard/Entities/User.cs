using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(UserId), RowKey = nameof(RowType))]
public sealed partial class User
{
    public const string UserInfoRowType = "Info";

    public partial string UserId { get; set; }
    public partial string RowType { get; set; }

    public partial string? Nickname { get; set; }
    public partial string? Roles { get; set; }
    public partial DateTimeOffset? LastVisited { get; set; }

    public IEnumerable<string> GetRoles()
    {
        if (Roles is null)
        {
            return [];
        }

        return Roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
}