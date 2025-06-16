using ProtoBuf;
using PulseGuard.Models;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "Day", RowKey = "Sqid", SupportBlobs = true)]
public sealed partial class PulseCheckResult
{
    public partial string Day { get; set; }
    public partial string Sqid { get; set; }
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial PulseCheckResultDetails Items { get; set; }

    public const string PartitionKeyFormat = "yyyyMMdd";

    public static PulseCheckResult From(PulseReport report, long elapsedMilliseconds)
    {
        var executionTime = DateTimeOffset.UtcNow;
        return new()
        {
            Day = executionTime.ToString(PartitionKeyFormat),
            Sqid = report.Options.Sqid,
            Group = report.Options.Group,
            Name = report.Options.Name,
            Items = [new(report.State, executionTime.ToUnixTimeSeconds(), elapsedMilliseconds)]
        };
    }

    public const char BodySeparator = '>';
    public const char Separator = ';';

    public BinaryData Serialize()
    {
        string data = string.Join(BodySeparator, string.Join(Separator, Day, Sqid, Group, Name), Items?.Serialize());
        return BinaryData.FromString(data);
    }

    public static PulseCheckResult Deserialize(BinaryData data)
    {
        var span = data.ToString().AsSpan();

        int splitIdx = span.IndexOf(BodySeparator);
        var header = span[..splitIdx];

        PulseCheckResult result = [];

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
                case 2:
                    result.Group = new(header[headerRange]);
                    break;
                case 3:
                    result.Name = new(header[headerRange]);
                    break;
            }

            headerSplitIdx++;
        }

        var details = span[(splitIdx + 1)..];
        result.Items = PulseCheckResultDetails.Deserialize(details);

        return result;
    }

    public static (string partition, string row, BinaryData data) GetAppendValue(PulseReport report, long? elapsedMilliseconds)
    {
        var executionTime = DateTimeOffset.UtcNow;
        string result = PulseCheckResultDetails.Separator + PulseCheckResultDetail.Serialize(report.State, executionTime.ToUnixTimeSeconds(), elapsedMilliseconds);
        var data = BinaryData.FromString(result);

        return (executionTime.ToString(PartitionKeyFormat), report.Options.Sqid, data);
    }

    public static string GetCurrentPartition() => DateTimeOffset.UtcNow.ToString(PartitionKeyFormat);
}

public sealed class PulseCheckResultDetails : List<PulseCheckResultDetail>
{
    public PulseCheckResultDetails() { }
    public PulseCheckResultDetails(IEnumerable<PulseCheckResultDetail> details) : base(details) { }

    public const char Separator = '|';

    public string Serialize() => string.Join(Separator, this.Select(x => x.Serialize()));

    public static PulseCheckResultDetails Deserialize(ReadOnlySpan<char> details)
    {
        PulseCheckResultDetails result = [];

        foreach (Range range in details.Split(Separator))
        {
            result.Add(PulseCheckResultDetail.Deserialize(details[range]));
        }

        return result;
    }
}

[ProtoContract(SkipConstructor = true)]
public sealed record PulseCheckResultDetail([property: ProtoMember(1)] PulseStates State, [property: ProtoMember(2)] long Timestamp, [property: ProtoMember(3)] long? ElapsedMilliseconds)
{
    public const char Separator = ';';

    public string Serialize() => Serialize(State, Timestamp, ElapsedMilliseconds);

    public static PulseCheckResultDetail Deserialize(ReadOnlySpan<char> value)
    {
        PulseStates state = PulseStatesFastString.FromNumber(value[0]);
        value = value[2..];

        int splitIdx = value.IndexOf(Separator);
        long creationTimestamp = long.Parse(value[..splitIdx]);
        long? elapsedMilliseconds = long.TryParse(value[(splitIdx + 1)..], out long elapsed) ? elapsed : null;

        return new(state, creationTimestamp, elapsedMilliseconds);
    }

    public static string Serialize(PulseStates state, long timestamp, long? elapsedMilliseconds)
        => string.Join(Separator, state.Numberify(), timestamp, elapsedMilliseconds);
}