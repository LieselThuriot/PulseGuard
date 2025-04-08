using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

public class HealthCheckPulseCheck(HttpClient client, PulseConfiguration options, ILogger<PulseCheck> logger) : PulseCheck(client, options)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        string? pulseResponse = await response.Content.ReadAsStringAsync(token);
        if (pulseResponse is null)
        {
            _logger.LogWarning(PulseEventIds.HealthApiCheck, "Pulse check failed with null response");
            return PulseReport.Fail(Options, "Pulse check failed with null response", null);
        }

        if (PulseStatesFastString.TryFromString(pulseResponse, out PulseStates pulseResponseState))
        {
            _logger.LogWarning(PulseEventIds.HealthApiCheck, "Pulse check failed due to unknown health response");
            return PulseReport.Fail(Options, "Pulse check failed due to unknown health response", pulseResponse);
        }

        string message;
        if (pulseResponseState is PulseStates.Healthy)
        {
            message = PulseReport.HealthyMessage;
            pulseResponse = null; //Don't store if healthy
        }
        else
        {
            message = $"Pulse check failed with status {pulseResponseState}";
        }

        _logger.LogInformation(PulseEventIds.HealthApiCheck, "Pulse check completed and is considered {HealthState}", pulseResponseState);
        return new(Options, pulseResponseState, message, pulseResponse);
    }
}