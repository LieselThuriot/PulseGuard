namespace PulseGuard.Models;

public sealed record HealthApiResponse(string Name, PulseStates State, long ElapsedTimeInMilliseconds)
{
    public string? Message { get; init; }
    //public IEnumerable<PulseResponse>? Dependencies { get; init; }
}
