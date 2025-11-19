using TableStorage;

#nullable disable

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Sqid), RowKey = nameof(Type))]
public sealed partial class PulseAgentConfiguration
{
    public partial string Sqid { get; set; }
    public partial string Type { get; set; } //typeof AgentCheckType
    public partial string Location { get; set; }
    public partial string ApplicationName { get; set; }
    public partial string SubscriptionId { get; set; }
    public partial int? BuildDefinitionId { get; set; }
    public partial bool Enabled { get; set; }
    public partial string Headers { get; set; }

    public IEnumerable<(string name, string values)> GetHeaders() => ParseHeaders(Headers);

    public static IEnumerable<(string name, string values)> ParseHeaders(string headers)
    {
        if (!string.IsNullOrEmpty(headers))
        {
            foreach (string header in headers.Split(';', StringSplitOptions.RemoveEmptyEntries))
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
}