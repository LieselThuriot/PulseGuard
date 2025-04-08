namespace PulseGuard.Models;

public sealed record HealthApiResponse(
    PulseStates State
    //, string? Name
    //, long? ElapsedTimeInMilliseconds
    , string? Message
    , IEnumerable<HealthApiResponseDetail>? Dependencies
);

public record HealthApiResponseDetail(
      string Name
    , PulseStates State
    //, string ApplicationCode
    //, int ElapsedTimeInMilliseconds
    //, IEnumerable<HealthApiResponseDetail>? Dependencies
    //, string[] FunctionalitiesSupported
);
