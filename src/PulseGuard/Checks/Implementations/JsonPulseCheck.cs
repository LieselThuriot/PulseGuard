using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;

namespace PulseGuard.Checks.Implementations;

public sealed class JsonPulseCheck(HttpClient client, PulseConfiguration options, AuthHeader? authorization, ILogger<PulseCheck> logger) : PulseCheck(client, options, authorization)
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

        if (!IsJsonSubset(Options.ComparisonValue, pulseResponse))
        {
            _logger.PulseCheckFailedDueToMismatchedJson();
            return PulseReport.Fail(Options, "Pulse check failed due to mismatched JSON", pulseResponse);
        }

        return PulseReport.Success(Options);
    }

    private static bool IsJsonSubset(string subsetJson, string fullJson)
    {
        try
        {
            var subsetObject = JObject.Parse(subsetJson);
            var fullObject = JObject.Parse(fullJson);
            JObject intersection = new(subsetObject.Intersect(fullObject, JToken.EqualityComparer));
            return JToken.DeepEquals(subsetObject, intersection);
        }
        catch (JsonException)
        {
            // Handle invalid JSON format
            return false;
        }
    }
}