namespace PulseGuard.Models;

public sealed record StatusApiResponse(
      PulseStates Status
    //, long? Duration
    //, long? TotalDuration
    , Dictionary<string, StatusApiDetails>? Details
    , Dictionary<string, StatusApiDetails>? Entries
);

public sealed record StatusApiDetails(
      PulseStates Status
    //, long? Duration
    //, string? Description
    //, Dictionary<string, bool> Data
);