namespace PulseGuard.Models.Admin;

public sealed record WebhookEntry(string Id, string Group, string Name, string Location, bool Enabled);