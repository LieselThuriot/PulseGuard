namespace PulseGuard.Models.Admin;

public sealed record WebhookCreationRequest(string Secret, string Group, string Name, string Location, bool Enabled);