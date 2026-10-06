namespace PulseGuard.Models.Admin;

public sealed record ApiKeyEntry(string Id, string Label, DateTimeOffset Created, int? ValidForDays);

public sealed record ApiKeyCreationRequest(string Label, int? ValidForDays);

public sealed record ApiKeyCreatedResponse(string Id, string Key);
