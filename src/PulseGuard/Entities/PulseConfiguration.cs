using ProtoBuf;
using PulseGuard.Checks;
using TableStorage;

#nullable disable

namespace PulseGuard.Entities;

[ProtoContract(IgnoreListHandling = true, UseProtoMembersOnly = true)]
[TableSet(PartitionKey = nameof(Group), RowKey = nameof(Name))]
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

    [ProtoMember(12)]
    public partial string AuthenticationId { get; set; }

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

    public static string CreateHeaders(IDictionary<string, string> headers)
    {
        if (headers is null || headers.Count is 0)
        {
            return null;
        }

        return string.Join(";", headers.Select(x => x.Key + ":" + x.Value));
    }

    public void SetCredential(string type, string id)
    {
        if (string.IsNullOrEmpty(type) || string.IsNullOrEmpty(id))
        {
            AuthenticationId = null;
            return;
        }

        AuthenticationId = type + '|' + id;
    }

    public (string Type, string Id)? GetCredential()
    {
        if (string.IsNullOrEmpty(AuthenticationId))
        {
            return null;
        }

        string[] split = AuthenticationId.Split('|', 2);
        return (split[0], split[1]);
    }
}
