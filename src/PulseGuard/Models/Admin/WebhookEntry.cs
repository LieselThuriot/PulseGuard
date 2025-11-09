using PulseGuard.Entities;

namespace PulseGuard.Models.Admin;

public sealed record WebhookEntry(string Id, WebhookType Type, string Group, string Name, string Location, bool Enabled);