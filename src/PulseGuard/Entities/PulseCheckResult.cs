using PulseGuard.Models;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "Day", RowKey = "Sqid", SupportBlobs = true)]
public sealed partial class PulseCheckResult
{
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial PulseCheckResultDetails Items { get; set; }

    public const string PartitionKeyFormat = "yyyyMMdd";

    public static PulseCheckResult From(PulseReport report, long? elapsedMilliseconds)
    {
        var executionTime = DateTimeOffset.UtcNow;
        return new()
        {
            Day = executionTime.ToString(PartitionKeyFormat),
            Sqid = report.Options.Sqid,
            Group = report.Options.Group,
            Name = report.Options.Name,
            Items = [ new(report.State, executionTime, elapsedMilliseconds) ]
        };
    }

    public const char Separator = '>';

    public BinaryData Serialize()
    {
        string data = string.Join(Separator, string.Join(PulseCheckResultDetail.Separator, Day, Sqid, Group, Name), Items?.Serialize());
        return BinaryData.FromString(data);
    }

    public static PulseCheckResult Deserialize(BinaryData data)
    {
        string[] parts = data.ToString().Split(Separator, 2);
        string[] header = parts[0].Split(PulseCheckResultDetail.Separator, 4);
        string details = parts[1];
        return new()
        {
            Day = header[0],
            Sqid = header[1],
            Group = header[2],
            Name = header[3],
            Items = PulseCheckResultDetails.Deserialize(details)
        };
    }

    public static (string partition, string row, BinaryData data) GetAppendValue(PulseReport report, long? elapsedMilliseconds)
    {
        var executionTime = DateTimeOffset.UtcNow;
        string result = PulseCheckResultDetails.Separator + PulseCheckResultDetail.Serialize(report.State, executionTime, elapsedMilliseconds);
        var data = BinaryData.FromString(result);

        return (executionTime.ToString(PartitionKeyFormat), report.Options.Sqid, data);
    }

    public static IEnumerable<string> GetPartitions(int days = PulseContext.RecentDays)
    {
        var now = DateTimeOffset.UtcNow;
        return Enumerable.Range(0, days).Select(i => now.AddDays(-i).ToString(PartitionKeyFormat));
    }
}

public sealed class PulseCheckResultDetails : List<PulseCheckResultDetail>
{
    public PulseCheckResultDetails() { }
    public PulseCheckResultDetails(IEnumerable<PulseCheckResultDetail> details) : base(details) { }

    public const char Separator = '|';

    public string Serialize() => string.Join(Separator, this.Select(x => x.Serialize()));

    public static PulseCheckResultDetails Deserialize(string details) => [.. details.Split(Separator).Select(PulseCheckResultDetail.Deserialize)];
}

public sealed record PulseCheckResultDetail(PulseStates State, DateTimeOffset CreationTimestamp, long? ElapsedMilliseconds)
{
    public const char Separator = ';';

    public string Serialize() => Serialize(State, CreationTimestamp, ElapsedMilliseconds);
    
    public static PulseCheckResultDetail Deserialize(string value)
    {
        string[] detail = value.Split(Separator, 3);

        PulseStates state = PulseStatesFastString.FromNumber(detail[0]);
        var creationTimestamp = DateTimeOffset.FromUnixTimeSeconds(long.Parse(detail[1]));
        long? elapsedMilliseconds = long.TryParse(detail[2], out long elapsed) ? elapsed : null;

        return new(state, creationTimestamp, elapsedMilliseconds);
    }

    public static string Serialize(PulseStates state, DateTimeOffset executionTime, long? elapsedMilliseconds)
    {
        return string.Join(Separator, state.Numberify(), executionTime.ToUnixTimeSeconds(), elapsedMilliseconds);
    }
}