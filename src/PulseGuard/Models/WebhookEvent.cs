using System.Text.Json.Serialization;

namespace PulseGuard.Models;

[JsonPolymorphic]
[JsonDerivedType(typeof(WebhookEvent), "StateChange")]
[JsonDerivedType(typeof(ThresholdWebhookEvent), "Threshold")]
public abstract record WebhookEventBase(string Id, string Group, string Name);

public sealed record WebhookEvent(string Id, string Group, string Name, WebhookEventPayload Payload) : WebhookEventBase(Id, Group, Name);
public sealed record WebhookEventPayload(string OldState, string NewState, long Timestamp, double? Duration, string? Reason);

public sealed record ThresholdWebhookEvent(string Id, string Group, string Name, long Timestamp, int Threshold) : WebhookEventBase(Id, Group, Name);
