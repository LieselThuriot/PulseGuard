using PulseGuard.Agents.Implementations;
using PulseGuard.Entities;

namespace PulseGuard.Agents;

public sealed class AgentCheckFactory(HttpClient client, ILogger<AgentCheck> logger)
{
    private readonly HttpClient _client = client;
    private readonly ILogger<AgentCheck> _logger = logger;

    public AgentCheck Create(PulseAgentConfiguration options)
    {
        return AgentCheckTypeFastString.FromString(options.Type) switch
        {
            AgentCheckType.ApplicationInsights => new ApplicationInsightsAgent(_client, options, _logger),
            _ => throw new ArgumentOutOfRangeException(nameof(options), options.Type, null)
        };
    }
}
