using PulseGuard.Models;
using TableStorage;

namespace PulseGuard.Entities;

[TableSet(PartitionKey = "Sqid", RowKey = "ContinuationToken")]
public sealed partial class Pulse
{
    public partial string Group { get; set; }
    public partial string Name { get; set; }
    public partial string Message { get; set; }
    public partial string? Error { get; set; }
    public partial PulseStates State { get; set; }
    public partial DateTimeOffset CreationTimestamp { get; set; }
    public partial DateTimeOffset LastUpdatedTimestamp { get; set; }

    public string GetFullName()
    {
        string result = Name;

        if (!string.IsNullOrWhiteSpace(Group))
        {
            result = $"{Group} > {result}";
        }

        return result;
    }

    public static Pulse From(PulseReport report)
    {
        var executionTime = DateTimeOffset.UtcNow;
        return new()
        {
            Sqid = report.Options.Sqid,
            ContinuationToken = CreateContinuationToken(executionTime),
            Group = report.Options.Group,
            Name = report.Options.Name,
            State = report.State,
            Message = report.Message,
            Error = report.Error,
            Timestamp = executionTime,
            LastUpdatedTimestamp = executionTime,
            CreationTimestamp = executionTime
        };
    }

    public static string CreateContinuationToken(DateTimeOffset dateTimeOffset)
    {
        const int maxLength = 11;

        long unixTimeSeconds = dateTimeOffset.ToUnixTimeSeconds();
        char[] letters = new char[maxLength];

        for (int i = maxLength - 1; i >= 0; i--)
        {
            long digit = unixTimeSeconds % 10;
            unixTimeSeconds /= 10;

            letters[i] = (char)('Z' - digit);
        }

        return new string(letters);
    }

    public long GetUnixTimeSeconds() => ConvertToUnixTimeSeconds(ContinuationToken);

    public static long ConvertToUnixTimeSeconds(string rowKey)
    {
        long number = 0;

        foreach (char letter in rowKey.AsSpan())
        {
            int digit = 'Z' - letter;
            number = (number * 10) + digit;
        }

        return number;
    }
}
