namespace PulseGuard.Models;

public sealed record WebhookEvent(string Id, string Group, string Name, WebhookEventPayload Payload);
public sealed record WebhookEventPayload(string OldState, string NewState, long Timestamp, double? Duration, string? Reason);

public sealed record ThresholdWebhookEvent(string Id, string Group, string Name, long Timestamp, int Threshold);
