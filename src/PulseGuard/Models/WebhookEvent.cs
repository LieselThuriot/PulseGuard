namespace PulseGuard.Models;

public sealed class WebhookEvent
{
    public required string Id { get; set; }
    public required string Group { get; set; }
    public required string Name { get; set; }
    public required WebhookEventPayload Payload { get; set; }
}

public sealed class WebhookEventPayload
{
    public required string OldState { get; set; }
    public required string NewState { get; set; }
    public required long Timestamp { get; set; }
    public double? Duration { get; set; }
    public string? Reason { get; set; }
}