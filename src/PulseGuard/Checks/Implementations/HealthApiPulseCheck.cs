using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

internal sealed class HealthApiPulseCheck(HttpClient client, PulseConfiguration options, ILogger<PulseCheck> logger) : PulseCheck(client, options)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        string? pulseResponseString = await response.Content.ReadAsStringAsync(token);
        if (pulseResponseString is null)
        {
            _logger.PulseCheckFailedWithNullResponse();
            return PulseReport.Fail(Options, "Pulse check failed with null response", null);
        }

        HealthApiResponse? pulseResponse;
        try
        {
            pulseResponse = PulseSerializerContext.Default.HealthApiResponse.Deserialize(pulseResponseString);

            if (pulseResponse is null)
            {
                _logger.PulseCheckFailedDueToDeserializationErrorNoEx();
                return PulseReport.Fail(Options, "Pulse check failed due to deserialization error", pulseResponseString);
            }

            pulseResponseString = PulseSerializerContext.Default.HealthApiResponse.Serialize(pulseResponse); // Remove extra's
        }
        catch (Exception ex)
        {
            _logger.PulseCheckFailedDueToDeserializationError(ex);
            return PulseReport.Fail(Options, "Pulse check failed due to deserialization error", pulseResponseString);
        }

        string message;
        if (pulseResponse.State is PulseStates.Healthy)
        {
            message = PulseReport.HealthyMessage;
            pulseResponseString = null; //Don't store if healthy
        }
        else
        {
            message = pulseResponse.Message ?? $"Pulse check failed with status {pulseResponse.State}";
        }

        _logger.PulseCheckCompleted(pulseResponse.State.ToString());
        return new(Options, pulseResponse.State, message, pulseResponseString);
    }
}