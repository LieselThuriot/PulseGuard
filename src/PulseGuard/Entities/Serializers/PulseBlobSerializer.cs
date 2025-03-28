using PulseGuard.Models;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using TableStorage;

namespace PulseGuard.Entities.Serializers;

public class PulseBlobSerializer : IBlobSerializer
{
    private static JsonTypeInfo<T> GetTypeInfo<T>()
        => PulseSerializerContext.Default.GetTypeInfo(typeof(T)) as JsonTypeInfo<T> ?? throw new NotSupportedException("No metadata found for type " + typeof(T));

    public async ValueTask<T?> DeserializeAsync<T>(string _, Stream entity, CancellationToken cancellationToken) where T : IBlobEntity
    {
        if (typeof(T) == typeof(PulseCheckResult))
        {
            var data = await BinaryData.FromStreamAsync(entity, cancellationToken);
            return (T)(object)PulseCheckResult.Deserialize(data);
        }

        return await JsonSerializer.DeserializeAsync(entity, GetTypeInfo<T>(), cancellationToken);
    }

    public BinaryData Serialize<T>(string _, T entity) where T : IBlobEntity
    {
        if (entity is PulseCheckResult pulse)
        {
            return pulse.Serialize();
        }

        byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(entity, GetTypeInfo<T>());
        return BinaryData.FromBytes(bytes);
    }
}
