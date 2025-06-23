using ProtoBuf;

namespace PulseGuard;

internal static class Proto
{
    public static ProtoResult Result(object result) => new(result);

    public static BinaryData Serialize<T>(T value)
    {
        using MemoryStream stream = new();
        Serializer.Serialize(stream, value);
        return new(stream.GetBuffer().AsMemory(0, (int)stream.Position));
    }

    public static T Deserialize<T>(Stream stream)
    {
        return Serializer.Deserialize<T>(stream);
    }
}