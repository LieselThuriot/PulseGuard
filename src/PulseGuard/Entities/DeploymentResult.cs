using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Sqid), RowKey = nameof(ContinuationToken))]
public sealed partial class DeploymentResult
{
    public partial string Sqid { set; get; }
    public partial string ContinuationToken { set; get; }
    public partial DateTimeOffset Start { get; set; }
    public partial DateTimeOffset? End { get; set; }
    public partial string Author { get; set; }
    public partial string Status { get; set; }
    public partial string? Type { get; set; }
    public partial string? CommitId { get; set; }
    public partial string? BuildNumber { get; set; }
}