using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;
using static PulseGuard.Agents.Implementations.ApplicationInsightsAgent;

namespace PulseGuard.Models;

[JsonSourceGenerationOptions(
    JsonSerializerDefaults.Web,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    UseStringEnumConverter = true,
    WriteIndented = false)]
[JsonSerializable(typeof(IAsyncEnumerable<PulseOverviewGroup>))]
[JsonSerializable(typeof(Dictionary<string, PulseStates>))]
[JsonSerializable(typeof(PulseOverviewStateGroup))]
[JsonSerializable(typeof(PulseDetailGroupItem))]
[JsonSerializable(typeof(PulseStateGroupItem))]
[JsonSerializable(typeof(PulseReport))]
[JsonSerializable(typeof(HealthApiResponse))]
[JsonSerializable(typeof(StatusApiResponse))]
[JsonSerializable(typeof(WebhookEventBase))]
[JsonSerializable(typeof(WebhookEvent))]
[JsonSerializable(typeof(ThresholdWebhookEvent))]
[JsonSerializable(typeof(PulseEvent))]
[JsonSerializable(typeof(PulseEventInfo))]
[JsonSerializable(typeof(AgentReport))]
[JsonSerializable(typeof(PulseAgentReport))]
[JsonSerializable(typeof(DeploymentAgentReport))]
[JsonSerializable(typeof(ApplicationInsightsQueryResponse))]
[JsonSerializable(typeof(UserInfo))]
[JsonSerializable(typeof(EmptyUserInfo))]
[JsonSerializable(typeof(PulseDeployments))]
[JsonSerializable(typeof(PulseDeployment))]

[JsonSerializable(typeof(Admin.PulseEntryType))]
[JsonSerializable(typeof(Admin.PulseEntry))]
[JsonSerializable(typeof(Admin.PulseUpdateRequest))]
[JsonSerializable(typeof(Admin.PulseCreationRequest))]
[JsonSerializable(typeof(Admin.PulseAgentCreationRequest))]
[JsonSerializable(typeof(Admin.WebhookEntry))]
[JsonSerializable(typeof(Admin.WebhookUpdateRequest))]
[JsonSerializable(typeof(Admin.WebhookCreationRequest))]
[JsonSerializable(typeof(Admin.UserEntry))]
[JsonSerializable(typeof(Admin.UserCreateOrUpdateRequest))]
[JsonSerializable(typeof(Admin.RenameUserRequest))]

[JsonSerializable(typeof(Entities.Pulse))]
[JsonSerializable(typeof(Entities.PulseCheckResult))]
[JsonSerializable(typeof(Entities.PulseConfiguration))]
[JsonSerializable(typeof(Entities.PulseAgentConfiguration))]
[JsonSerializable(typeof(Entities.UniqueIdentifier))]
[JsonSerializable(typeof(Entities.Webhook))]
[JsonSerializable(typeof(Entities.ArchivedPulseCheckResult))]
[JsonSerializable(typeof(Entities.ArchivedPulseAgentCheckResult))]
[JsonSerializable(typeof(Entities.DeploymentResult))]

[JsonSerializable(typeof(Agents.Implementations.DeploymentMessageData))]
[JsonSerializable(typeof(Agents.Implementations.EnvironmentDeploymentRecords))]
[JsonSerializable(typeof(Agents.Implementations.EnvironmentDeploymentBuildRecord))]
[JsonSerializable(typeof(Agents.Implementations.DevOpsReleaseRecords))]
[JsonSerializable(typeof(Agents.Implementations.DevOpsReleaseDetails))]
public sealed partial class PulseSerializerContext : JsonSerializerContext;

internal static class SerializerExtensions
{
    extension<T>(JsonTypeInfo<T> typeInfo)
    {
        public string Serialize(T value) => JsonSerializer.Serialize(value, typeInfo);
        public Task SerializeAsync(Stream stream, T value, CancellationToken token) => JsonSerializer.SerializeAsync(stream, value, typeInfo, token);
        public byte[] SerializeToUtf8Bytes(T value) => JsonSerializer.SerializeToUtf8Bytes(value, typeInfo);
        public T? Deserialize(string value) => JsonSerializer.Deserialize(value, typeInfo);
        public T? Deserialize(ReadOnlySpan<byte> value) => JsonSerializer.Deserialize(value, typeInfo);
        public ValueTask<T?> DeserializeAsync(Stream value, CancellationToken token) => JsonSerializer.DeserializeAsync(value, typeInfo, token);
        public Task<T?> DeserializeAsync(HttpContent value, CancellationToken token) => value.ReadFromJsonAsync(typeInfo, token);
        public Task<T?> DeserializeAsync(HttpResponseMessage value, CancellationToken token) => typeInfo.DeserializeAsync(value.Content, token);
    }
}