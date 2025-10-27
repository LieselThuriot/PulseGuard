using PulseGuard.Entities;

namespace PulseGuard.Models.Admin;

public sealed record UserEntry(string Id, string? Nickname, IEnumerable<string> Roles, DateTimeOffset? LastVisited)
{
    public UserEntry(User user) : this(user.UserId, user.Nickname, user.GetRoles(), user.LastVisited) { }
}