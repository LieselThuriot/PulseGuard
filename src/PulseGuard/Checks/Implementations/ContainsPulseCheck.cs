using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Checks.Implementations;

public sealed class ContainsPulseCheck(HttpClient client, PulseConfiguration options, ILogger<PulseCheck> logger) : PulseCheck(client, options)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        string pulseResponse = await response.Content.ReadAsStringAsync(token);
        if (string.IsNullOrEmpty(pulseResponse))
        {
            _logger.LogWarning(PulseEventIds.ContainsCheck, "Pulse check failed with null response");
            return PulseReport.Fail(Options, "Pulse check failed with null response", null);
        }

        if (!pulseResponse.Contains(Options.ComparisonValue))
        {
            _logger.LogWarning(PulseEventIds.ContainsCheck, "Pulse check failed due to mismatched page content");
            return PulseReport.Fail(Options, "Pulse check failed due to mismatched page content", pulseResponse);
        }

        return PulseReport.Success(Options);
    }
}
