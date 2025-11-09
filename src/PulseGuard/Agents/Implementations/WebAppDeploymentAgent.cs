using Azure.ResourceManager;
using Azure.ResourceManager.AppService;
using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

public sealed class WebAppDeploymentAgent(ArmClient client, IReadOnlyList<PulseAgentConfiguration> options, ILogger<AgentCheck> logger) : IAgentCheck
{
    [Flags]
    private enum DeploymentStatus
    {
        Undefined = 0,
        NotDeployed = 1,
        InProgress = 2,
        Succeeded = 4,
        PartiallySucceeded = 8,
        Failed = 16
    }

    private readonly ArmClient _client = client;
    private readonly IReadOnlyList<PulseAgentConfiguration> _options = options;
    private readonly ILogger<AgentCheck> _logger = logger;

    public async Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token)
    {
        List<AgentReport> reports = [];

        DateTimeOffset lastWeek = DateTimeOffset.UtcNow.AddDays(-7);

        foreach (PulseAgentConfiguration option in _options)
        {
            try
            {
                string subscriptionId = option.SubscriptionId;
                string resourceGroupName = option.Location;
                string name = option.ApplicationName;

                var resourceId = WebSiteResource.CreateResourceIdentifier(subscriptionId, resourceGroupName, name);
                var website = await _client.GetWebSiteResource(resourceId).GetAsync(token);

                if (!website.HasValue)
                {
                    _logger.LogError(PulseEventIds.WebAppDeploymentAgent, "Web App not found: {ResourceId}", resourceId);
                    continue;
                }

                var deployments = website.Value.GetSiteDeployments();
                var query = deployments.GetAllAsync(token)
                                       .Where(x => x.HasData)
                                       .Select(x => x.Data)
                                       .Where(x => x.StartOn.HasValue && x.EndOn.HasValue && x.Status.HasValue)
                                       .TakeWhile(x => x.StartOn >= lastWeek)
                                       .WithCancellation(token);

                await foreach (WebAppDeploymentData deployment in query)
                {
                    DateTimeOffset start = deployment.StartOn.GetValueOrDefault();
                    DateTimeOffset end = deployment.EndOn.GetValueOrDefault();

                    var status = (DeploymentStatus)deployment.Status.GetValueOrDefault();

                    (string? type, string? commit, string? buildNumber) = GetEnrichments(deployment);

                    DeploymentAgentReport report = new(option,
                                                       deployment.Author,
                                                       status.ToString(),
                                                       start,
                                                       end,
                                                       type,
                                                       commit,
                                                       buildNumber);
                    reports.Add(report);
                }
            }
            catch (Exception innerException)
            {
                _logger.LogError(PulseEventIds.WebAppDeploymentAgent, innerException, "Error checking deployment agent");
            }
        }

        return reports;
    }

    private (string? type, string? commit, string? buildNumber) GetEnrichments(WebAppDeploymentData deployment)
    {
        try
        {
            if (!string.IsNullOrEmpty(deployment.Message) &&
                PulseSerializerContext.Default.DeploymentMessageData.Deserialize(deployment.Message) is DeploymentMessageData messageData)
            {
                return (messageData.Type, messageData.CommitId, messageData.BuildNumber);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(PulseEventIds.WebAppDeploymentAgent, ex, "Failed to deserialize deployment message: {Message}", deployment.Message);
        }

        return default;
    }
}

public sealed record DeploymentMessageData(string? Type, string? CommitId, string? BuildNumber);
