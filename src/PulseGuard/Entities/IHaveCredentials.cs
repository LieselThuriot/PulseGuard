namespace PulseGuard.Entities;

public interface IHaveCredentials
{
    public string? AuthenticationId { get; set; }

    public void SetCredential(CredentialType? type, string? id)
    {
        if (!type.HasValue || string.IsNullOrEmpty(id))
        {
            AuthenticationId = null;
            return;
        }

        AuthenticationId = $"{type.GetValueOrDefault()}|{id}";
    }

    public (CredentialType Type, string Id)? GetCredential()
    {
        if (string.IsNullOrEmpty(AuthenticationId))
        {
            return null;
        }

        string[] split = AuthenticationId.Split('|', 2);
        return (split[0].ToCredentialType(), split[1]);
    }
}