using TableStorage;

namespace PulseGuard.Entities;

[TableSet(RowKey = nameof(Id))]
public sealed partial class ApiKeyCredentials
{
    public partial string Id { get; set; }

    public partial string Header { get; set; }
    public partial string ApiKey { get; set; }
}