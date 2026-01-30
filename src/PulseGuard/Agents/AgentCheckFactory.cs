using Azure.ResourceManager;
using PulseGuard.Agents.Implementations;
using PulseGuard.Entities;
using PulseGuard.Services;

namespace PulseGuard.Agents;

public sealed class AgentCheckFactory(HttpClient client, ArmClient armClient, AuthService authenticationService, ILogger<AgentCheck> logger)
{
    private readonly HttpClient _client = client;
    private readonly ArmClient _armClient = armClient;
    private readonly AuthService _authenticationService = authenticationService;
    private readonly ILogger<AgentCheck> _logger = logger;

    public IAgentCheck Create(string type, IReadOnlyList<PulseAgentConfiguration> options)
    {
        return AgentCheckTypeFastString.FromString(type) switch
        {
            AgentCheckType.ApplicationInsights => new ApplicationInsightsAgent(_client, options, _authenticationService, _logger),
            AgentCheckType.LogAnalyticsWorkspace => new LogAnalyticsWorkspaceAgent(_client, options, _authenticationService, _logger),
            AgentCheckType.WebAppDeployment => new WebAppDeploymentAgent(_armClient, options, _logger),
            AgentCheckType.DevOpsDeployment => new DevOpsDeploymentAgent(_client, options, _authenticationService, _logger),
            AgentCheckType.DevOpsRelease => new DevOpsReleaseAgent(_client, options, _authenticationService, _logger),
            _ => throw new ArgumentOutOfRangeException(nameof(options), type, null)
        };
    }
}
