using System.Text.Json;
using System.Text.Json.Serialization;

namespace PulseGuard.Agents;

[JsonConverter(typeof(AgentCheckTypeJsonConverter))]
public enum AgentCheckType
{
    ApplicationInsights = 1,
    LogAnalyticsWorkspace = 2,
    WebAppDeployment = 3,
    DevOpsDeployment = 4
}

public sealed class AgentCheckTypeJsonConverter : JsonConverter<AgentCheckType>
{
    public override AgentCheckType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) => reader.TokenType switch
    {
        JsonTokenType.String => AgentCheckTypeFastString.FromString(reader.GetString()!),
        JsonTokenType.Number => AgentCheckTypeFastString.FromNumber(reader.GetInt32()),
        _ => throw new JsonException()
    };

    public override void Write(Utf8JsonWriter writer, AgentCheckType value, JsonSerializerOptions options) => writer.WriteStringValue(value.Stringify());
}

internal static class AgentCheckTypeFastString
{
    public static string Stringify(this AgentCheckType state) => state switch
    {
        AgentCheckType.ApplicationInsights => nameof(AgentCheckType.ApplicationInsights),
        AgentCheckType.LogAnalyticsWorkspace => nameof(AgentCheckType.LogAnalyticsWorkspace),
        AgentCheckType.WebAppDeployment => nameof(AgentCheckType.WebAppDeployment),
        AgentCheckType.DevOpsDeployment => nameof(AgentCheckType.DevOpsDeployment),

        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static AgentCheckType FromString(string state) => state switch
    {
        nameof(AgentCheckType.ApplicationInsights) => AgentCheckType.ApplicationInsights,
        nameof(AgentCheckType.LogAnalyticsWorkspace) => AgentCheckType.LogAnalyticsWorkspace,
        nameof(AgentCheckType.WebAppDeployment) => AgentCheckType.WebAppDeployment,
        nameof(AgentCheckType.DevOpsDeployment) => AgentCheckType.DevOpsDeployment,

        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    public static AgentCheckType FromNumber(int state) => state switch
    {
        (int)AgentCheckType.ApplicationInsights => AgentCheckType.ApplicationInsights,
        (int)AgentCheckType.LogAnalyticsWorkspace => AgentCheckType.LogAnalyticsWorkspace,
        (int)AgentCheckType.WebAppDeployment => AgentCheckType.WebAppDeployment,
        (int)AgentCheckType.DevOpsDeployment => AgentCheckType.DevOpsDeployment,

        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };
}