using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Id), RowKey = nameof(Secret))]
public sealed partial class Webhook
{
    public partial string Id { get; set; }
    public partial string Secret { get; set; }
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial string Location { get; set; }
    public partial bool Enabled { get; set; }
    public partial WebhookType Type { get; set; }
    public partial string? AuthenticationId { get; set; }

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

public enum WebhookType
{
    All = 0,
    StateChange = 1,
    ThresholdBreach = 2
}
