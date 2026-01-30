using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Id))]
public sealed partial class BasicCredentials
{
    public partial string Id { get; set; }

    public partial string? Username { get; set; }
    public partial string Password { get; set; }
}