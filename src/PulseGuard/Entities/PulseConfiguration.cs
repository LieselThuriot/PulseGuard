using PulseGuard.Checks;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "Group", RowKey = "Name")]
public sealed partial class PulseConfiguration
{
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial string Location { get; set; }
    public partial PulseCheckType Type { get; set; }
    public partial int Timeout { get; set; }
    public partial int? DegrationTimeout { get; set; }
    public partial bool Enabled { get; set; }
    public partial bool IgnoreSslErrors { get; set; }
    public partial string Sqid { get; set; }
    public partial string ComparisonValue { get; set; }
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
