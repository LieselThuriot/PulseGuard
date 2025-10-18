using PulseGuard.Agents;

namespace PulseGuard.Models.Admin;
#nullable disable

public sealed class PulseAgentCreationRequest
{
    public required string Location { get; set; }

    public string ApplicationName { get; set; }
    public bool Enabled { get; set; } = true;
    public Dictionary<string, string> Headers { get; set; }
}