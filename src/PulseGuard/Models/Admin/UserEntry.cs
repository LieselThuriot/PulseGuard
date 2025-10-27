using PulseGuard.Entities;

namespace PulseGuard.Models.Admin;

public sealed record UserEntry(string Id, string? Nickname, IEnumerable<string> Roles, DateTimeOffset? LastVisited)
{
    public UserEntry(UserInfos user) : this(user.Id!, user.NickName, user.Roles, user.LastVisited) { }
}