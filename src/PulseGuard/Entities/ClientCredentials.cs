using System.Diagnostics.CodeAnalysis;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Id))]
public sealed partial class ClientCredentials
{
    public partial string Id { get; set; }

    public partial Uri TokenEndpoint { get; set; }
    public partial string ClientId { get; set; }
    public partial string ClientSecret { get; set; }
    public partial string? Scopes { get; set; }
}

public sealed class ClientCredentialsComparer : IEqualityComparer<ClientCredentials>
{
    public static ClientCredentialsComparer Instance { get; } = new();
    public bool Equals(ClientCredentials? x, ClientCredentials? y)
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

    public int GetHashCode([DisallowNull] ClientCredentials obj) => HashCode.Combine(obj.TokenEndpoint, obj.ClientId, obj.ClientSecret, obj.Scopes);
}