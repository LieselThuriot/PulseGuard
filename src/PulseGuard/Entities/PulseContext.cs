using Azure.Core;
using Microsoft.Extensions.Options;
using PulseGuard.Checks;
using PulseGuard.Models;
using TableStorage;

namespace PulseGuard.Entities;

[TableContext]
public sealed partial class PulseContext
{
    public TableSet<PulseConfiguration> Configurations { get; }
    public TableSet<Pulse> Pulses { get; }
    public TableSet<UniqueIdentifiers> UniqueIdentifiers { get; }
    public TableSet<Webhook> Webhooks { get; }
}

[TableSet, PartitionKey("IdentifierType"), RowKey("Id")]
public sealed partial class UniqueIdentifiers;

[TableSet, PartitionKey("Secret"), RowKey("EntryNumber")]
[TableSetProperty(typeof(string), "Group")]
[TableSetProperty(typeof(string), "Name")]
[TableSetProperty(typeof(string), "Location")]
[TableSetProperty(typeof(bool), "Enabled")]
public sealed partial class Webhook;

[TableSet, PartitionKey("Group"), RowKey("Name")]
[TableSetProperty(typeof(string), "Location")]
[TableSetProperty(typeof(PulseCheckType), "Type")]
[TableSetProperty(typeof(int), "Timeout")]
[TableSetProperty(typeof(int?), "DegrationTimeout")]
[TableSetProperty(typeof(bool), "Enabled")]
[TableSetProperty(typeof(bool), "IgnoreSslErrors")]
[TableSetProperty(typeof(string), "Sqid")]
[TableSetProperty(typeof(string), "ComparisonValue")]
[TableSetProperty(typeof(string), "Headers")]
public sealed partial class PulseConfiguration
{
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

[TableSet, PartitionKey("Sqid"), RowKey("ContinuationToken")]
[TableSetProperty(typeof(string), "Group")]
[TableSetProperty(typeof(string), "Name")]
[TableSetProperty(typeof(string), "Message")]
[TableSetProperty(typeof(string), "Error")]
[TableSetProperty(typeof(PulseStates), "State")]
[TableSetProperty(typeof(DateTimeOffset), "CreationTimestamp")]
public sealed partial class Pulse
{
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
