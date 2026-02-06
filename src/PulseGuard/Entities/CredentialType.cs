namespace PulseGuard.Entities;

public enum CredentialType
{
    ApiKey,
    Basic,
    OAuth2
}

public static class CredentialTypeExtensions
{
    public static CredentialType ToCredentialType(this string credentialType)
    {
        return credentialType?.ToLower() switch
        {
            "apikey" or "apikeycredentials" => CredentialType.ApiKey,
            "basic" or "basiccredentials" => CredentialType.Basic,
            "oauth2" or "oauth2credentials" => CredentialType.OAuth2,
            _ => throw new ArgumentException($"Unknown credential type: {credentialType}")
        };
    }
}