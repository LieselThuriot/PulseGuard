using System.Text.Json;
using System.Text.Json.Serialization;

namespace PulseGuard.Models;

[JsonConverter(typeof(PulseStatesJsonConverter))]
public enum PulseStates
{
    Unknown,
    Healthy,
    Degraded,
    Unhealthy
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
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseStates FromString(string state) => state?.ToLowerInvariant() switch
    {
        "unknown" => PulseStates.Unknown,
        "healthy" => PulseStates.Healthy,
        "degraded" => PulseStates.Degraded,
        "unhealthy" => PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static int Numberify(this PulseStates state) => state switch
    {
        PulseStates.Unknown => (int)PulseStates.Unknown,
        PulseStates.Healthy => (int)PulseStates.Healthy,
        PulseStates.Degraded => (int)PulseStates.Degraded,
        PulseStates.Unhealthy => (int)PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseStates FromNumber(int state) => state switch
    {
        (int)PulseStates.Unknown => PulseStates.Unknown,
        (int)PulseStates.Healthy => PulseStates.Healthy,
        (int)PulseStates.Degraded => PulseStates.Degraded,
        (int)PulseStates.Unhealthy => PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseStates FromNumber(char state) => state switch
    {
        '0' => PulseStates.Unknown,
        '1' => PulseStates.Healthy,
        '2' => PulseStates.Degraded,
        '3' => PulseStates.Unhealthy,
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };
}