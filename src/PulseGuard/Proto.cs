//using Azure.Storage.Queues.Models;
//using ProtoBuf;
//using System.Diagnostics.CodeAnalysis;

//namespace PulseGuard;

//internal static class Proto
//{
//    public static BinaryData Serialize<T>(T value)
//    {
//        using MemoryStream stream = new();
//        Serializer.Serialize(stream, value);
//        return new(stream.GetBuffer().AsMemory(0, (int)stream.Position));
//    }

//    public static bool TryDeserialize<T>(QueueMessage value, [NotNullWhen(true)] out T? entity) => TryDeserialize(value.Body.ToMemory(), out entity);
//    public static T Deserialize<T>(QueueMessage value) => Deserialize<T>(value.Body.ToMemory());

//    public static bool TryDeserialize<T>(ReadOnlyMemory<byte> value, [NotNullWhen(true)] out T? entity)
//    {
//        try
//        {
//            entity = Deserialize<T>(value);
//            return entity is not null;
//        }
//        catch
//        {
//            entity = default;
//            return false;
//        }
//    }

//    public static T Deserialize<T>(ReadOnlyMemory<byte> value) => Serializer.Deserialize<T>(value);
//}