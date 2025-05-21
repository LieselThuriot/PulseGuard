using ProtoBuf;

namespace PulseGuard.Models;

[ProtoContract]
public sealed class PulseEventInfo
{
    [ProtoMember(1)]
    public required string Id { get; set; }

    [ProtoMember(2)]
    public required string Group { get; set; }

    [ProtoMember(3)]
    public required string Name { get; set; }

    [ProtoMember(4)]
    public required PulseStates State { get; set; }

    [ProtoMember(5)]
    public required DateTimeOffset Creation { get; set; }

    [ProtoMember(6)]
    public required long ElapsedMilliseconds { get; set; }
}
