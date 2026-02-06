using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;

namespace PulseGuard.Checks.Implementations;

public sealed class ContainsPulseCheck(HttpClient client, PulseConfiguration options, AuthHeader? authorization, ILogger<PulseCheck> logger) : PulseCheck(client, options, authorization)
{
    private readonly ILogger<PulseCheck> _logger = logger;

    protected override async Task<PulseReport> CreateReport(HttpResponseMessage response, CancellationToken token)
    {
        string pulseResponse = await response.Content.ReadAsStringAsync(token);
        if (string.IsNullOrEmpty(pulseResponse))
        {
            _logger.PulseCheckFailedWithNullResponse();
            return PulseReport.Fail(Options, "Pulse check failed with null response", null);
        }

        if (!pulseResponse.Contains(Options.ComparisonValue))
        {
            _logger.PulseCheckFailedDueToMismatchedPageContent();
            return PulseReport.Fail(Options, "Pulse check failed due to mismatched page content", pulseResponse);
        }

        return PulseReport.Success(Options);
    }
}