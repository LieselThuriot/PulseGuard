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
            _logger.PulseCheckFailedWithStatusCode((int)response.StatusCode);

            string? body;
            try
            {
                body = await response.Content.ReadAsStringAsync(token);
            }
            catch (Exception ex)
            {
                body = null;
                _logger.FailedToReadResponseBody(ex);
            }

            return PulseReport.Fail(Options, $"Pulse check failed with status code {response.StatusCode}", body);
        }

        _logger.PulseCheckCompletedHealthy();
        return PulseReport.Success(Options);
    }
}