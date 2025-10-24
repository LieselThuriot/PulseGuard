namespace PulseGuard.Models.Admin;

public sealed record UserCreateRequest(List<string> Roles)
{
    public string GetRoles()
    {
        if (Roles is null || Roles.Count is 0)
        {
            return string.Empty;
        }

        return string.Join(",", Roles);
    }
}