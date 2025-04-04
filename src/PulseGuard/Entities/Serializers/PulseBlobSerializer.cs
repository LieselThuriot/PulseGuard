using ProtoBuf;
using ProtoBuf.Meta;
using PulseGuard.Models;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using TableStorage;

namespace PulseGuard.Entities.Serializers;

public class PulseBlobSerializer : IBlobSerializer
{
    private static JsonTypeInfo<T> GetTypeInfo<T>()
        => PulseSerializerContext.Default.GetTypeInfo(typeof(T)) as JsonTypeInfo<T> ?? throw new NotSupportedException("No metadata found for type " + typeof(T));

    static PulseBlobSerializer()
    {
        RuntimeTypeModel.Default.Add(typeof(DateTimeOffset), false).SetSurrogate(typeof(DateTimeOffsetSurrogate));
    }

    public async ValueTask<T?> DeserializeAsync<T>(string _, Stream entity, CancellationToken cancellationToken) where T : IBlobEntity
    {
        if (typeof(T) == typeof(PulseCheckResult))
        {
            var data = await BinaryData.FromStreamAsync(entity, cancellationToken);
            return (T)(object)PulseCheckResult.Deserialize(data);
        }

        if (typeof(T) == typeof(ArchivedPulseCheckResult))
        {
            return Serializer.Deserialize<T>(entity);
        }

        return await JsonSerializer.DeserializeAsync(entity, GetTypeInfo<T>(), cancellationToken);
    }

    public BinaryData Serialize<T>(string _, T entity) where T : IBlobEntity
    {
        if (entity is PulseCheckResult pulse)
        {
            return pulse.Serialize();
        }

        if (entity is ArchivedPulseCheckResult archivedPulse)
        {
            using MemoryStream stream = new();
            Serializer.Serialize(stream, archivedPulse);
            return new(stream.GetBuffer().AsMemory(0, (int)stream.Position));
        }

        byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(entity, GetTypeInfo<T>());
        return BinaryData.FromBytes(bytes);
    }
}

[ProtoContract]
public struct DateTimeOffsetSurrogate
{
    [ProtoMember(1)]
    public long UnixTimeSeconds { get; set; }

    public static implicit operator DateTimeOffsetSurrogate(DateTimeOffset value) => new()
    {
        UnixTimeSeconds = value.ToUnixTimeSeconds()
    };

    public static implicit operator DateTimeOffset(DateTimeOffsetSurrogate value) => DateTimeOffset.FromUnixTimeSeconds(value.UnixTimeSeconds);
}