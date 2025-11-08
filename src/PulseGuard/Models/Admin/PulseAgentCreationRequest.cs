namespace PulseGuard.Models.Admin;

public sealed class PulseAgentCreationRequest
{
    public required string Location { get; set; }

    public required string ApplicationName { get; set; }
    public string? SubscriptionId { get; set; }
    public bool Enabled { get; set; } = true;
    public Dictionary<string, string>? Headers { get; set; }
}