using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

public class HealthCheckPulseCheck(HttpClient client, PulseConfiguration options, Services.AuthService authenticationService, ILogger<PulseCheck> logger) : PulseCheck(client, options, authenticationService)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        string? pulseResponse = await response.Content.ReadAsStringAsync(token);
        if (pulseResponse is null)
        {
            _logger.PulseCheckFailedWithNullResponse();
            return PulseReport.Fail(Options, "Pulse check failed with null response", null);
        }

        if (!PulseStatesFastString.TryFromString(pulseResponse, out PulseStates pulseResponseState))
        {
            _logger.PulseCheckFailedDueToUnknownHealthResponse();
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

        _logger.PulseCheckCompleted(pulseResponseState.ToString());
        return new(Options, pulseResponseState, message, pulseResponse);
    }
}