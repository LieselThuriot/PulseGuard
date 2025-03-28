using System.Text.Json;
using System.Text.Json.Serialization;

namespace PulseGuard.Checks;

[JsonConverter(typeof(PulseCheckTypeJsonConverter))]
public enum PulseCheckType
{
    HealthApi,
    StatusCode,
    Json,
    Contains,
    HealthCheck,
    StatusApi
}

public sealed class PulseCheckTypeJsonConverter : JsonConverter<PulseCheckType>
{
    public override PulseCheckType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => reader.TokenType switch
    {
        JsonTokenType.String => PulseCheckTypeFastString.FromString(reader.GetString()!),
        JsonTokenType.Number => PulseCheckTypeFastString.FromNumber(reader.GetInt32()),
        _ => throw new JsonException()
    };

    public override void Write(Utf8JsonWriter writer, PulseCheckType value, JsonSerializerOptions options) => writer.WriteStringValue(value.Stringify());
}

internal static class PulseCheckTypeFastString
{
    public static string Stringify(this PulseCheckType state) => state switch
    {
        PulseCheckType.HealthApi => nameof(PulseCheckType.HealthApi),
        PulseCheckType.StatusCode => nameof(PulseCheckType.StatusCode),
        PulseCheckType.Json => nameof(PulseCheckType.Json),
        PulseCheckType.Contains => nameof(PulseCheckType.Contains),
        PulseCheckType.HealthCheck => nameof(PulseCheckType.HealthCheck),
        PulseCheckType.StatusApi => nameof(PulseCheckType.StatusApi),

        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseCheckType FromString(string state) => state switch
    {
        nameof(PulseCheckType.HealthApi) => PulseCheckType.HealthApi,
        nameof(PulseCheckType.StatusCode) => PulseCheckType.StatusCode,
        nameof(PulseCheckType.Json) => PulseCheckType.Json,
        nameof(PulseCheckType.Contains) => PulseCheckType.Contains,
        nameof(PulseCheckType.HealthCheck) => PulseCheckType.HealthCheck,
        nameof(PulseCheckType.StatusApi) => PulseCheckType.StatusApi,

        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static PulseCheckType FromNumber(int state) => state switch
    {
        (int)PulseCheckType.HealthApi => PulseCheckType.HealthApi,
        (int)PulseCheckType.StatusCode => PulseCheckType.StatusCode,
        (int)PulseCheckType.Json => PulseCheckType.Json,
        (int)PulseCheckType.Contains => PulseCheckType.Contains,
        (int)PulseCheckType.HealthCheck => PulseCheckType.HealthCheck,
        (int)PulseCheckType.StatusApi => PulseCheckType.StatusApi,

        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };
}