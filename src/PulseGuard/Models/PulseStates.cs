using System.Text.Json;
using System.Text.Json.Serialization;

namespace PulseGuard.Models;

[JsonConverter(typeof(PulseStatesJsonConverter))]
public enum PulseStates
{
    Unknown = 0,
    Healthy = 1,
    Degraded = 2,
    Unhealthy = 3,
    TimedOut = 4
}

public sealed class PulseStatesJsonConverter : JsonConverter<PulseStates>
{
    public override PulseStates Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => reader.TokenType switch
    {
        JsonTokenType.String => PulseStatesFastString.FromString(reader.GetString()!),
        JsonTokenType.Number => PulseStatesFastString.FromNumber(reader.GetInt32()),
        _ => throw new JsonException()
    };

    public override void Write(Utf8JsonWriter writer, PulseStates value, JsonSerializerOptions options) => writer.WriteStringValue(value.Stringify());
}

internal static class PulseStatesFastString
{
    public static string Stringify(this PulseStates state) => state switch
    {
        PulseStates.Unknown => nameof(PulseStates.Unknown),
        PulseStates.Healthy => nameof(PulseStates.Healthy),
        PulseStates.Degraded => nameof(PulseStates.Degraded),
        PulseStates.Unhealthy => nameof(PulseStates.Unhealthy),
        PulseStates.TimedOut => nameof(PulseStates.TimedOut),
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, "Invalid enum value")
    };

    public static PulseStates FromString(string state)
        => TryFromString(state, out PulseStates result)
            ? result
            : throw new ArgumentOutOfRangeException(nameof(state), state, "Invalid enum value");

    public static bool TryFromString(string state, out PulseStates result)
    {
        switch (state?.ToLowerInvariant())
        {
            case "healthy":
                result = PulseStates.Healthy;
                return true;
            case "unhealthy":
                result = PulseStates.Unhealthy;
                return true;
            case "degraded":
                result = PulseStates.Degraded;
                return true;
            case "timedout":
                result = PulseStates.TimedOut;
                return true;
            case "unknown":
                result = PulseStates.Unknown;
                return true;
            default:
                result = PulseStates.Unknown;
                return false;
        }
    }

    public static int Numberify(this PulseStates state) => state switch
    {
        PulseStates.Unknown => (int)PulseStates.Unknown,
        PulseStates.Healthy => (int)PulseStates.Healthy,
        PulseStates.Degraded => (int)PulseStates.Degraded,
        PulseStates.Unhealthy => (int)PulseStates.Unhealthy,
        PulseStates.TimedOut => (int)PulseStates.TimedOut,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, "Invalid enum value")
    };

    public static PulseStates FromNumber(int state) => state switch
    {
        (int)PulseStates.Unknown => PulseStates.Unknown,
        (int)PulseStates.Healthy => PulseStates.Healthy,
        (int)PulseStates.Degraded => PulseStates.Degraded,
        (int)PulseStates.Unhealthy => PulseStates.Unhealthy,
        (int)PulseStates.TimedOut => PulseStates.TimedOut,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, "Invalid enum value")
    };

    public static PulseStates FromNumber(char state) => state switch
    {
        (char)('0' + (int)PulseStates.Unknown) => PulseStates.Unknown,
        (char)('0' + (int)PulseStates.Healthy) => PulseStates.Healthy,
        (char)('0' + (int)PulseStates.Degraded) => PulseStates.Degraded,
        (char)('0' + (int)PulseStates.Unhealthy) => PulseStates.Unhealthy,
        (char)('0' + (int)PulseStates.TimedOut) => PulseStates.TimedOut,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, "Invalid enum value")
    };
}