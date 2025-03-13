using System.Text.Json;
using System.Text.Json.Serialization;
using TableStorage;

namespace PulseGuard.Entities.Serializers;

public class PulseBlobSerializer : IBlobSerializer
{
    private static readonly JsonSerializerOptions s_options = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async ValueTask<T?> DeserializeAsync<T>(Stream entity, CancellationToken cancellationToken) where T : IBlobEntity
    {
        var data = await BinaryData.FromStreamAsync(entity, cancellationToken);

        if (typeof(T) == typeof(PulseCheckResult))
        {
            return (T)(object)PulseCheckResult.Deserialize(data);
        }

        return data.ToObjectFromJson<T>(s_options);
    }

    public BinaryData Serialize<T>(T entity) where T : IBlobEntity
    {
        if (entity is PulseCheckResult pulse)
        {
            return pulse.Serialize();
        }

        return BinaryData.FromObjectAsJson(entity, s_options);
    }
}
