using ProtoBuf;
using TableStorage;

namespace PulseGuard.Entities;

[ProtoContract]
[TableSet(PartitionKey = "Year", RowKey = "Sqid", SupportBlobs = true, DisableTables = true)]
public sealed partial class ArchivedPulseAgentCheckResult
{
    [ProtoMember(1)]
    public partial string Year { get; set; }

    [ProtoMember(2)]
    public partial string Sqid { get; set; }

    [ProtoMember(3)]
    public partial string Group { get; set; }

    [ProtoMember(4)]
    public partial string Name { get; set; }

    [ProtoMember(5)]
    public partial PulseAgentCheckResultDetails Items { get; set; }
}
