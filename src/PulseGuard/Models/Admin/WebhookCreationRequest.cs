using PulseGuard.Entities;

namespace PulseGuard.Models.Admin;

public sealed record WebhookCreationRequest(WebhookType Type, string Secret, string Group, string Name, string Location, bool Enabled);