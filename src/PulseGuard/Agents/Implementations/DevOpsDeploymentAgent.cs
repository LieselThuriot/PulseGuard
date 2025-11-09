using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

public sealed class DevOpsDeploymentAgent(HttpClient client, IReadOnlyList<Entities.PulseAgentConfiguration> options, ILogger<AgentCheck> logger) : AgentCheck(client, options)
{
    private readonly ILogger<AgentCheck> _logger = logger;

    public override async Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token)
    {
        List<AgentReport> reports = [];

        DateTimeOffset window = DateTimeOffset.UtcNow.AddHours(-2);

        foreach (var option in Options)
        {
            try
            {
                string project = option.Location;
                string team = option.ApplicationName;
                string environmentId = option.SubscriptionId;

                EnvironmentDeploymentRecords? response = await GetDeployments(option, project, team, environmentId, token);

                if (response?.Value is null)
                {
                    continue;
                }

                foreach (EnvironmentDeploymentRecord? deployment in response.Value.Where(x => x.StartTime >= window))
                {
                    (string? author, string? commitId, string? buildNumber) = await GetEnrichments(option, project, team, deployment, token);

                    DeploymentAgentReport report = new (option,
                                                        author,
                                                        deployment.Result,
                                                        deployment.StartTime,
                                                        deployment.FinishTime,
                                                        "Deployment",
                                                        commitId,
                                                        buildNumber);

                    reports.Add(report);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, ex, "Error checking DevOps Deployment agent for {ApplicationName} in project {Location}", option.ApplicationName, option.Location);
            }
        }

        return reports;
    }

    private async Task<EnvironmentDeploymentRecords?> GetDeployments(Entities.PulseAgentConfiguration option, string project, string team, string environmentId, CancellationToken token)
    {
        // Requires Read access to Environments and Deployments
        string environmentUrl = $"https://dev.azure.com/{project}/{team}/_apis/distributedtask/environments/{environmentId}/environmentdeploymentrecords?api-version=7.1&top=5";

        HttpRequestMessage request = new(HttpMethod.Get, environmentUrl);
        var result = await Send(request, option, token);

        if (!result.IsSuccessStatusCode)
        {
            _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, "Failed to retrieve deployments for {ApplicationName} in project {Location}. Status Code: {StatusCode}", option.ApplicationName, option.Location, result.StatusCode);
            return null;
        }

        return await PulseSerializerContext.Default.EnvironmentDeploymentRecords.DeserializeAsync(result, token);
    }

    private async Task<(string? author, string? commitId, string? buildNumber)> GetEnrichments(Entities.PulseAgentConfiguration option, string project, string team, EnvironmentDeploymentRecord deployment, CancellationToken token)
    {
        try
        {
            if (deployment.Owner?.Id is int buildId)
            {
                // Requires Read access to Builds
                string buildUrl = $"https://dev.azure.com/{project}/{team}/_apis/build/builds/{buildId}?api-version=7.1";

                HttpRequestMessage buildRequest = new(HttpMethod.Get, buildUrl);
                var buildResult = await Send(buildRequest, option, token);

                if (buildResult.IsSuccessStatusCode)
                {
                    EnvironmentDeploymentBuildRecord? buildRecord = await PulseSerializerContext.Default.EnvironmentDeploymentBuildRecord.DeserializeAsync(buildResult, token);
                    if (buildRecord is not null)
                    {
                        string? author = buildRecord.RequestedFor?.DisplayName ?? buildRecord.RequestedFor?.UniqueName;
                        string? commitId = buildRecord.SourceVersion;
                        string? buildNumber = buildRecord.BuildNumber;
                        return (author, commitId, buildNumber);
                    }
                }
                else
                {
                    _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, "Failed to retrieve build {BuildId} for {ApplicationName} in project {Location}. Status Code: {StatusCode}", buildId, option.ApplicationName, option.Location, buildResult.StatusCode);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, ex, "Error retrieving enrichments for deployment owned by {OwnerId} for {ApplicationName} in project {Location}", deployment.Owner?.Id, option.ApplicationName, option.Location);
        }

        return default;
    }
}

public sealed record EnvironmentDeploymentRecords(List<EnvironmentDeploymentRecord>? Value);
public sealed record EnvironmentDeploymentRecord(string Result, DateTimeOffset StartTime, DateTimeOffset FinishTime, EnvironmentDeploymentOwner Owner);
public sealed record EnvironmentDeploymentOwner(int? Id);

public sealed record EnvironmentDeploymentBuildRecord(string? SourceVersion, EnvironmentDeploymentBuildRequestedfor? RequestedFor, string? BuildNumber);
public sealed record EnvironmentDeploymentBuildRequestedfor(string? DisplayName, string? UniqueName);
