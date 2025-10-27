namespace PulseGuard.Models.Admin;

public sealed record UserCreateOrUpdateRequest(string? Nickname, List<string>? Roles)
{
    public string? GetRoles()
    {
        if (Roles is null || Roles.Count is 0)
        {
            return null;
        }

        return string.Join(",", Roles);
    }
}
