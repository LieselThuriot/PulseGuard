using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;

namespace PulseGuard.Checks.Implementations;

internal sealed class StatusApiPulseCheck(HttpClient client, PulseConfiguration options, AuthHeader? authorization, ILogger<PulseCheck> logger) : PulseCheck(client, options, authorization)
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

        StatusApiResponse? pulseResponse;
        try
        {
            pulseResponse = PulseSerializerContext.Default.StatusApiResponse.Deserialize(pulseResponseString);

            if (pulseResponse is null)
            {
                _logger.PulseCheckFailedDueToDeserializationErrorNoEx();
                return PulseReport.Fail(Options, "Pulse check failed due to deserialization error", pulseResponseString);
            }

            pulseResponseString = PulseSerializerContext.Default.StatusApiResponse.Serialize(pulseResponse); // remove extra's
        }
        catch (Exception ex)
        {
            _logger.PulseCheckFailedDueToDeserializationError(ex);
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

        _logger.PulseCheckCompleted(pulseResponse.Status.ToString());
        return new(Options, pulseResponse.Status, message, pulseResponseString);
    }
}