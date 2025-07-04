using PulseGuard.Checks.Implementations;
using PulseGuard.Entities;

namespace PulseGuard.Checks;

public sealed class PulseCheckFactory(HttpClient client, ILogger<PulseCheck> logger)
{
    private readonly HttpClient _client = client;
    private readonly ILogger<PulseCheck> _logger = logger;

    public PulseCheck Create(PulseConfiguration options)
    {
        return options.Type switch
        {
            PulseCheckType.HealthApi => new HealthApiPulseCheck(_client, options, _logger),
            PulseCheckType.StatusCode => new StatusCodePulseCheck(_client, options, _logger),
            PulseCheckType.Json => new JsonPulseCheck(_client, options, _logger),
            PulseCheckType.Contains => new ContainsPulseCheck(_client, options, _logger),
            PulseCheckType.HealthCheck => new HealthCheckPulseCheck(_client, options, _logger),
            PulseCheckType.StatusApi => new StatusApiPulseCheck(_client, options, _logger),
            PulseCheckType.Sql => new SqlPulseCheck(_client, options, _logger),
            _ => throw new ArgumentOutOfRangeException(nameof(options), options.Type, null)
        };
    }
}