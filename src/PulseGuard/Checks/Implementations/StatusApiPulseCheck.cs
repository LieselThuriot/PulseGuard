using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

internal sealed class StatusApiPulseCheck(HttpClient client, PulseConfiguration options, ILogger<PulseCheck> logger) : PulseCheck(client, options)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        string? pulseResponseString = await response.Content.ReadAsStringAsync(token);
        if (pulseResponseString is null)
        {
            _logger.LogWarning(PulseEventIds.HealthApiCheck, "Pulse check failed with null response");
            return PulseReport.Fail(Options, "Pulse check failed with null response", null);
        }

        StatusApiResponse? pulseResponse;
        try
        {
            pulseResponse = PulseSerializerContext.Default.StatusApiResponse.Deserialize(pulseResponseString);

            if (pulseResponse is null)
            {
                _logger.LogWarning(PulseEventIds.HealthApiCheck, "Pulse check failed due to deserialization error");
                return PulseReport.Fail(Options, "Pulse check failed due to deserialization error", pulseResponseString);
            }

            pulseResponseString = PulseSerializerContext.Default.StatusApiResponse.Serialize(pulseResponse); // remove extra's
        }
        catch (Exception ex)
        {
            _logger.LogWarning(PulseEventIds.HealthApiCheck, ex, "Pulse check failed due to deserialization error");
            return PulseReport.Fail(Options, "Pulse check failed due to deserialization error", pulseResponseString);
        }

        string message;
        if (pulseResponse.Status is PulseStates.Healthy)
        {
            message = PulseReport.HealthyMessage;
            pulseResponseString = null; //Don't store if healthy
        }
        else
        {
            message = $"Pulse check failed with status {pulseResponse.Status}";
        }

        _logger.LogInformation(PulseEventIds.HealthApiCheck, "Pulse check completed and is considered {HealthState}", pulseResponse.Status);
        return new(Options, pulseResponse.Status, message, pulseResponseString);
    }
}