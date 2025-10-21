namespace PulseGuard.Models;

public sealed record EmptyUserInfo();
public sealed record UserInfo(string? Id, string? Firstname, string? Lastname, IEnumerable<string> Roles);
