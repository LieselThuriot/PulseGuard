using ProtoBuf;

namespace PulseGuard.Models;

[ProtoContract]
public sealed class WebhookEvent
{
    [ProtoMember(1)]
    public required string Id { get; set; }

    [ProtoMember(2)]
    public required string Group { get; set; }

    [ProtoMember(3)]
    public required string Name { get; set; }

    [ProtoMember(4)]
    public required WebhookEventPayload Payload { get; set; }
}

[ProtoContract]
public sealed class WebhookEventPayload
{
    [ProtoMember(1)]
    public required string OldState { get; set; }

    [ProtoMember(2)]
    public required string NewState { get; set; }

    [ProtoMember(3)]
    public required long Timestamp { get; set; }

    [ProtoMember(4)]
    public double? Duration { get; set; }

    [ProtoMember(5)]
    public string? Reason { get; set; }
}