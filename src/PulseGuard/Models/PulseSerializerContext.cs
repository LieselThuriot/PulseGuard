﻿using System.Text.Json;
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
[JsonSerializable(typeof(WebhookEvent))]
[JsonSerializable(typeof(ThresholdWebhookEvent))]
[JsonSerializable(typeof(PulseEvent))]
[JsonSerializable(typeof(PulseEventInfo))]
[JsonSerializable(typeof(PulseAgentReport))]
[JsonSerializable(typeof(ApplicationInsightsQueryResponse))]
[JsonSerializable(typeof(UserInfo))]
[JsonSerializable(typeof(EmptyUserInfo))]

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
[JsonSerializable(typeof(Entities.UniqueIdentifier))]
[JsonSerializable(typeof(Entities.Webhook))]
[JsonSerializable(typeof(Entities.ArchivedPulseCheckResult))]
public sealed partial class PulseSerializerContext : JsonSerializerContext;

internal static class SerializerExtensions
{
    public static string Serialize<T>(this JsonTypeInfo<T> typeInfo, T value) => JsonSerializer.Serialize(value, typeInfo);
    public static Task SerializeAsync<T>(this JsonTypeInfo<T> typeInfo, Stream stream, T value, CancellationToken token) => JsonSerializer.SerializeAsync(stream, value, typeInfo, token);
    public static byte[] SerializeToUtf8Bytes<T>(this JsonTypeInfo<T> typeInfo, T value) => JsonSerializer.SerializeToUtf8Bytes(value, typeInfo);
    public static T? Deserialize<T>(this JsonTypeInfo<T> typeInfo, string value) => JsonSerializer.Deserialize(value, typeInfo);
    public static T? Deserialize<T>(this JsonTypeInfo<T> typeInfo, ReadOnlySpan<byte> value) => JsonSerializer.Deserialize(value, typeInfo);
    public static ValueTask<T?> DeserializeAsync<T>(this JsonTypeInfo<T> typeInfo, Stream value, CancellationToken token) => JsonSerializer.DeserializeAsync(value, typeInfo, token);
    public static Task<T?> DeserializeAsync<T>(this JsonTypeInfo<T> typeInfo, HttpContent value, CancellationToken token) => value.ReadFromJsonAsync(typeInfo, token);
    public static Task<T?> DeserializeAsync<T>(this JsonTypeInfo<T> typeInfo, HttpResponseMessage value, CancellationToken token) => typeInfo.DeserializeAsync(value.Content, token);
}