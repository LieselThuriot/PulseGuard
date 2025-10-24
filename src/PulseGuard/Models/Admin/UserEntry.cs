using System.Text.Json.Serialization;

namespace PulseGuard.Models.Admin;

[method: JsonConstructor]
public sealed record UserEntry(string Id, IEnumerable<string> Roles)
{
    public UserEntry(Entities.User user) : this(user.UserId, user.Value?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [])
    {

    }

    public string GetRoles()
    {
        if (Roles is null)
        {
            return string.Empty;
        }

        return string.Join(",", Roles);
    }
}
