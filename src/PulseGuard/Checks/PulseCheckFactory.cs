using PulseGuard.Checks.Implementations;
using PulseGuard.Entities;
using PulseGuard.Services;

namespace PulseGuard.Checks;

public sealed class PulseCheckFactory(HttpClient client, AuthService authenticationService, ILogger<PulseCheck> logger)
{
    private readonly HttpClient _client = client;
    private readonly AuthService _authenticationService = authenticationService;
    private readonly ILogger<PulseCheck> _logger = logger;

    public PulseCheck Create(PulseConfiguration options)
    {
        return options.Type switch
        {
            PulseCheckType.HealthApi => new HealthApiPulseCheck(_client, options, _authenticationService, _logger),
            PulseCheckType.StatusCode => new StatusCodePulseCheck(_client, options, _authenticationService, _logger),
            PulseCheckType.Json => new JsonPulseCheck(_client, options, _authenticationService, _logger),
            PulseCheckType.Contains => new ContainsPulseCheck(_client, options, _authenticationService, _logger),
            PulseCheckType.HealthCheck => new HealthCheckPulseCheck(_client, options, _authenticationService, _logger),
            PulseCheckType.StatusApi => new StatusApiPulseCheck(_client, options, _authenticationService, _logger),
            _ => throw new ArgumentOutOfRangeException(nameof(options), options.Type, null)
        };
    }
}