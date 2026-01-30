using System.Diagnostics.CodeAnalysis;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Id))]
public sealed partial class OAuth2Credentials
{
    public partial string Id { get; set; }

    public partial string TokenEndpoint { get; set; }
    public partial string ClientId { get; set; }
    public partial string ClientSecret { get; set; }
    public partial string? Scopes { get; set; }
}

internal sealed class OAuth2CredentialsComparer : IEqualityComparer<OAuth2Credentials>
{
    public static OAuth2CredentialsComparer Instance { get; } = new();
    public bool Equals(OAuth2Credentials? x, OAuth2Credentials? y)
    {
        if (x is null && y is null)
        {
            return true;
        }

        if (x is null || y is null)
        {
            return false;
        }

        return x.TokenEndpoint == y.TokenEndpoint &&
               x.ClientId == y.ClientId &&
               x.ClientSecret == y.ClientSecret &&
               x.Scopes == y.Scopes;
    }

    public int GetHashCode([DisallowNull] OAuth2Credentials obj) => HashCode.Combine(obj.TokenEndpoint, obj.ClientId, obj.ClientSecret, obj.Scopes);
}