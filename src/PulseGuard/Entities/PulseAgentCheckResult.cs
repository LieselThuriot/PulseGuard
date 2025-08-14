using PulseGuard.Models;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "Day", RowKey = "Sqid", SupportBlobs = true, DisableTables = true)]
public sealed partial class PulseAgentCheckResult
{
    public partial string Day { get; set; }
    public partial string Sqid { get; set; }
    public partial PulseAgentCheckResultDetails Items { get; set; }

    public const string PartitionKeyFormat = "yyyyMMdd";

    public static PulseAgentCheckResult From(PulseAgentReport report)
    {
        var executionTime = DateTimeOffset.UtcNow;
        return new()
        {
            Day = executionTime.ToString(PartitionKeyFormat),
            Sqid = report.Options.Sqid,
            Items = [new(report.CpuPercentage, report.Memory)]
        };
    }

    public const char BodySeparator = '>';
    public const char Separator = ';';

    public BinaryData Serialize()
    {
        string data = string.Join(BodySeparator, string.Join(Separator, Day, Sqid), Items?.Serialize());
        return BinaryData.FromString(data);
    }

    public static PulseAgentCheckResult Deserialize(BinaryData data)
    {
        var span = data.ToString().AsSpan();

        int splitIdx = span.IndexOf(BodySeparator);
        var header = span[..splitIdx];

        PulseAgentCheckResult result = new();

        int headerSplitIdx = 0;
        foreach (Range headerRange in header.Split(Separator))
        {
            switch (headerSplitIdx)
            {
                case 0:
                    result.Day = new(header[headerRange]);
                    break;
                case 1:
                    result.Sqid = new(header[headerRange]);
                    break;
            }

            headerSplitIdx++;
        }

        var details = span[(splitIdx + 1)..];
        result.Items = PulseAgentCheckResultDetails.Deserialize(details);

        return result;
    }

    public static (string partition, string row, BinaryData data) GetAppendValue(PulseAgentReport report)
    {
        var executionTime = DateTimeOffset.UtcNow;
        string result = PulseAgentCheckResultDetails.Separator + PulseAgentCheckResultDetail.Serialize(report.CpuPercentage, report.Memory);
        var data = BinaryData.FromString(result);

        return (executionTime.ToString(PartitionKeyFormat), report.Options.Sqid, data);
    }

    public static string GetCurrentPartition() => DateTimeOffset.UtcNow.ToString(PartitionKeyFormat);
}

public sealed class PulseAgentCheckResultDetails : List<PulseAgentCheckResultDetail>
{
    public PulseAgentCheckResultDetails() { }
    public PulseAgentCheckResultDetails(IEnumerable<PulseAgentCheckResultDetail> details) : base(details) { }

    public const char Separator = '|';

    public string Serialize() => string.Join(Separator, this.Select(x => x.Serialize()));

    public static PulseAgentCheckResultDetails Deserialize(ReadOnlySpan<char> details)
    {
        PulseAgentCheckResultDetails result = [];

        foreach (Range range in details.Split(Separator))
        {
            result.Add(PulseAgentCheckResultDetail.Deserialize(details[range]));
        }

        return result;
    }
}

public sealed record PulseAgentCheckResultDetail(double? Cpu, double? Memory)
{
    public const char Separator = ';';

    public string Serialize() => Serialize(Cpu, Memory);

    public static PulseAgentCheckResultDetail Deserialize(ReadOnlySpan<char> value)
    {
        int splitIdx = value.IndexOf(Separator);
        double? cpu = double.TryParse(value[..splitIdx], out double parsed) ? parsed : null;
        double? memory = double.TryParse(value[(splitIdx + 1)..], out parsed) ? parsed : null;

        return new(cpu, memory);
    }

    public static string Serialize(double? cpu, double? memory)
        => string.Join(Separator, cpu, memory);
}