using System.Security.Claims;
using System.Security.Principal;
using TableStorage;
using static Microsoft.ApplicationInsights.MetricDimensionNames.TelemetryContext;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(UserId), RowKey = nameof(RowType))]
public sealed partial class User
{
    public const string RowTypeRoles = "Roles";
    public const string RowTypeLastVisited = "LastVisited";
    public const string RowTypeNickname = "Nickname";

    public partial string UserId { get; set; }
    public partial string RowType { get; set; }
    public partial string? Value { get; set; }
}

public readonly struct UserInfos
{
    private readonly string? _roles;
    private readonly string? _lastVisited;

    public readonly string? Id { get; }
    public readonly string? NickName { get; }
    public readonly bool IsKnown { get; }

    public UserInfos(IReadOnlyList<User> users)
    {
        if (users.Count is 0)
        {
            IsKnown = false;
        }
        else
        {
            IsKnown = true;

            foreach (var user in users)
            {
                Id = user.UserId;
                if (user.RowType is User.RowTypeRoles)
                {
                    _roles = user.Value;
                }
                else if (user.RowType is User.RowTypeLastVisited)
                {
                    _lastVisited = user.Value;
                }
                else if (user.RowType is User.RowTypeNickname)
                {
                    NickName = user.Value;
                }
            }
        }
    }

    public IEnumerable<string> Roles
    {
        get
        {
            if (_roles is null)
            {
                return [];
            }

            return _roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }
    }

    public readonly DateTimeOffset? LastVisited
    {
        get
        {
            if (long.TryParse(_lastVisited, out long unixTimeSeconds))
            {
                return DateTimeOffset.FromUnixTimeSeconds(unixTimeSeconds);
            }

            return null;
        }
    }
}