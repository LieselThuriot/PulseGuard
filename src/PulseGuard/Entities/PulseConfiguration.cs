using ProtoBuf;
using PulseGuard.Checks;
using TableStorage;

namespace PulseGuard.Entities;

[ProtoContract(IgnoreListHandling = true, UseProtoMembersOnly = true)]
[TableSet(PartitionKey = "Group", RowKey = "Name")]
public sealed partial class PulseConfiguration
{
    [ProtoMember(1)]
    public partial string Group { get; set; }

    [ProtoMember(2)]
    public partial string Name { get; set; }

    [ProtoMember(3)]
    public partial string Location { get; set; }

    [ProtoMember(4)]
    public partial PulseCheckType Type { get; set; }

    [ProtoMember(5)]
    public partial int Timeout { get; set; }

    [ProtoMember(6)]
    public partial int? DegrationTimeout { get; set; }

    [ProtoMember(7)]
    public partial bool Enabled { get; set; }

    [ProtoMember(8)]
    public partial bool IgnoreSslErrors { get; set; }

    [ProtoMember(9)]
    public partial string Sqid { get; set; }

    [ProtoMember(10)]
    public partial string ComparisonValue { get; set; }

    [ProtoMember(11)]
    public partial string Headers { get; set; }

    public IEnumerable<(string name, string values)> GetHeaders()
    {
        if (!string.IsNullOrEmpty(Headers))
        {
            foreach (string header in Headers.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                string[] split = header.Split(':', 2);
                yield return (split[0], split[1]);
            }
        }
    }
}
