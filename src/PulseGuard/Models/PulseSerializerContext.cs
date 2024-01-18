using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace PulseGuard.Models;

[JsonSourceGenerationOptions(JsonSerializerDefaults.Web, UseStringEnumConverter = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(IAsyncEnumerable<PulseOverviewGroup>))]
[JsonSerializable(typeof(Dictionary<string, PulseStates>))]
[JsonSerializable(typeof(PulseOverviewStateGroup))]
[JsonSerializable(typeof(PulseDetailGroupItem))]
[JsonSerializable(typeof(PulseStateGroupItem))]
[JsonSerializable(typeof(PulseReport))]
[JsonSerializable(typeof(HealthApiResponse))]
[JsonSerializable(typeof(WebhookEvent))]
public partial class PulseSerializerContext : JsonSerializerContext;

internal static class SerializerExtensions
{
    public static string Serialize<T>(this JsonTypeInfo<T> typeInfo, T value) => JsonSerializer.Serialize(value, typeInfo);
    public static byte[] SerializeToUtf8Bytes<T>(this JsonTypeInfo<T> typeInfo, T value) => JsonSerializer.SerializeToUtf8Bytes(value, typeInfo);
    public static T? Deserialize<T>(this JsonTypeInfo<T> typeInfo, string value) => JsonSerializer.Deserialize(value, typeInfo);
    public static ValueTask<T?> DeserializeAsync<T>(this JsonTypeInfo<T> typeInfo, Stream value, CancellationToken token) => JsonSerializer.DeserializeAsync(value, typeInfo, token);
    public static Task<T?> DeserializeAsync<T>(this JsonTypeInfo<T> typeInfo, HttpContent value, CancellationToken token) => value.ReadFromJsonAsync(typeInfo, token);
    public static Task<T?> DeserializeAsync<T>(this JsonTypeInfo<T> typeInfo, HttpResponseMessage value, CancellationToken token) => typeInfo.DeserializeAsync(value.Content, token);
}