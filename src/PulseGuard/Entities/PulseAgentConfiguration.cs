using PulseGuard.Agents;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = nameof(Sqid), RowKey = nameof(Type))]
public sealed partial class PulseAgentConfiguration
{
    public partial string Sqid { get; set; }
    public partial string Type { get; set; } //typeof AgentCheckType
    public partial string Location { get; set; }
    public partial bool Enabled { get; set; }
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