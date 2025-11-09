using PulseGuard.Entities;

namespace PulseGuard.Models.Admin;

public sealed record WebhookUpdateRequest(WebhookType Type, string Group, string Name, string Location, bool Enabled);
