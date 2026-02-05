using PulseGuard.Checks.Implementations;
using PulseGuard.Entities;
using PulseGuard.Services;

namespace PulseGuard.Checks;

public sealed class PulseCheckFactory(HttpClient client, ILogger<PulseCheck> logger)
{
    private readonly HttpClient _client = client;
    private readonly ILogger<PulseCheck> _logger = logger;

    public PulseCheck Create(PulseConfiguration options, AuthHeader? authorization)
    {
        return options.Type switch
        {
            PulseCheckType.HealthApi => new HealthApiPulseCheck(_client, options, authorization, _logger),
            PulseCheckType.StatusCode => new StatusCodePulseCheck(_client, options, authorization, _logger),
            PulseCheckType.Json => new JsonPulseCheck(_client, options, authorization, _logger),
            PulseCheckType.Contains => new ContainsPulseCheck(_client, options, authorization, _logger),
            PulseCheckType.HealthCheck => new HealthCheckPulseCheck(_client, options, authorization, _logger),
            PulseCheckType.StatusApi => new StatusApiPulseCheck(_client, options, authorization, _logger),
            _ => throw new ArgumentOutOfRangeException(nameof(options), options.Type, null)
        };
    }
}