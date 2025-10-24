namespace PulseGuard.Models.Admin;

public sealed record WebhookUpdateRequest(string Group, string Name, string Location, bool Enabled);
