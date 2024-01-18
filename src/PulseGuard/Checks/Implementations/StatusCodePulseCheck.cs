using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

internal sealed class StatusCodePulseCheck(HttpClient client, PulseConfiguration options, ILogger<PulseCheck> logger) : PulseCheck(client, options)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning(PulseEventIds.StatusCodeCheck, "Pulse check failed with status code {StatusCode}", response.StatusCode);

            string? body;
            try
            {
                body = await response.Content.ReadAsStringAsync(token);
            }
            catch (Exception ex)
            {
                body = null;
                _logger.LogWarning(PulseEventIds.StatusCodeCheck, ex, "Failed to read response body");
            }

            return PulseReport.Fail(Options, $"Pulse check failed with status code {response.StatusCode}", body);
        }

        _logger.LogInformation(PulseEventIds.StatusCodeCheck, "Pulse check completed and is considered healthy");
        return PulseReport.Success(Options);
    }
}