using PulseGuard.Checks;

namespace PulseGuard.Models.Admin;

public sealed class PulseCreationRequest
{
    public required PulseCheckType Type { get; set; }
    public required string Group { get; set; }
    public required string Name { get; set; }
    public required string Location { get; set; }

    public int Timeout { get; set; }
    public int? DegrationTimeout { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IgnoreSslErrors { get; set; }
    public string? ComparisonValue { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}