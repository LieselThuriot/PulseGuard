using PulseGuard.Agents.Implementations;
using PulseGuard.Entities;

namespace PulseGuard.Agents;

public sealed class AgentCheckFactory(HttpClient client, ILogger<AgentCheck> logger)
{
    private readonly HttpClient _client = client;
    private readonly ILogger<AgentCheck> _logger = logger;

    public AgentCheck Create(string type, IReadOnlyList<PulseAgentConfiguration> options)
    {
        return AgentCheckTypeFastString.FromString(type) switch
        {
            AgentCheckType.ApplicationInsights => new ApplicationInsightsAgent(_client, options, _logger),
            AgentCheckType.LogAnalyticsWorkspace => new LogAnalyticsWorkspaceAgent(_client, options, _logger),
            _ => throw new ArgumentOutOfRangeException(nameof(options), type, null)
        };
    }
}
