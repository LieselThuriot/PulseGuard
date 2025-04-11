using ProtoBuf;
namespace PulseGuard.Models;

[ProtoContract]
public sealed class PulseEvent
{
    [ProtoMember(1)]
    public required long ElapsedMilliseconds { get; set; }

    [ProtoMember(2)]
    public required PulseReport Report { get; set; }
}
