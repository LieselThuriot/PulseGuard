using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

/// <summary>
/// For YAML pipelines using Environments and Deployments
/// </summary>
public sealed class DevOpsDeploymentAgent(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options, ILogger<AgentCheck> logger) : IAgentCheck
{
    private readonly HttpClient _client = client;
    private readonly IReadOnlyList<PulseAgentConfiguration> _options = options;
    private readonly ILogger<AgentCheck> _logger = logger;

    public Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token)
    {
        DateTimeOffset window = DateTimeOffset.UtcNow.AddHours(-1);
        return IterateEnvironments(window, token);
    }

    private async Task<IReadOnlyList<AgentReport>> IterateEnvironments(DateTimeOffset window, CancellationToken token)
    {
        List<AgentReport> reports = [];

        foreach (var environmentGroup in _options.GroupBy(o => (project: o.Location, team: o.ApplicationName, environmentId: o.SubscriptionId, headers: o.Headers)))
        {
            var (project, team, environmentId, headers) = environmentGroup.Key;

            try
            {
                await HandleEnvironment(window, reports, environmentGroup, project, team, environmentId, headers, token);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, ex, "Error processing deployments for project {Project}, team {Team}, environment ID {EnvironmentId}", environmentGroup.Key.project, environmentGroup.Key.team, environmentGroup.Key.environmentId);
            }
        }

        return reports;
    }

    private async Task HandleEnvironment(DateTimeOffset window, List<AgentReport> reports, IGrouping<(string project, string team, string environmentId, string headers), PulseAgentConfiguration> environmentGroup, string project, string team, string environmentId, string headers, CancellationToken token)
    {
        var headerList = PulseAgentConfiguration.ParseHeaders(headers);

        EnvironmentDeploymentRecords? response = await GetDeployments(project, team, environmentId, headerList, token);

        if (response?.Value is null)
        {
            return;
        }

        ILookup<int, EnvironmentDeploymentRecord> deploymentRecords = response.Value.Where(x => x.StartTime >= window && x.Definition?.Id is not null && x.Result is not "cancelled")
                                                                                    .ToLookup(x => x.Definition.Id.GetValueOrDefault());

        await IterateBuilds(reports, environmentGroup, project, team, headerList, deploymentRecords, token);
    }

    private async Task IterateBuilds(List<AgentReport> reports, IGrouping<(string project, string team, string environmentId, string headers), PulseAgentConfiguration> environmentGroup, string project, string team, IEnumerable<(string name, string values)> headerList, ILookup<int, EnvironmentDeploymentRecord> deploymentRecords, CancellationToken token)
    {
        foreach (var buildGroup in environmentGroup.GroupBy(o => o.BuildDefinitionId.GetValueOrDefault()))
        {
            foreach (EnvironmentDeploymentRecord? deployment in deploymentRecords[buildGroup.Key])
            {
                string? author = null;
                string? commitId = null;
                string? buildNumber = null;

                if (deployment.Owner?.Id is int buildId)
                {
                    (author, commitId, buildNumber) = await GetEnrichments(project, team, buildId, headerList, token);
                }

                var reportsToAdd = buildGroup.Select(option => new DeploymentAgentReport(option,
                                                                                         author,
                                                                                         deployment.Result,
                                                                                         deployment.StartTime,
                                                                                         deployment.FinishTime,
                                                                                         "Deployment",
                                                                                         commitId,
                                                                                         buildNumber));
                reports.AddRange(reportsToAdd);
            }
        }
    }

    private Task<HttpResponseMessage> Send(string url, IEnumerable<(string name, string values)> headers, CancellationToken token)
    {
        HttpRequestMessage request = new(HttpMethod.Get, url);
        foreach ((string name, string value) in headers)
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }

        return _client.SendAsync(request, token);
    }

    private async Task<EnvironmentDeploymentRecords?> GetDeployments(string project, string team, string environmentId, IEnumerable<(string name, string values)> headers, CancellationToken token)
    {
        // Requires Read access to Environments and Deployments
        string environmentUrl = $"https://dev.azure.com/{project}/{team}/_apis/distributedtask/environments/{environmentId}/environmentdeploymentrecords?api-version=7.1&top=5";

        HttpResponseMessage result = await Send(environmentUrl, headers, token);

        if (!result.IsSuccessStatusCode)
        {
            _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, "Failed to retrieve deployment records for environment ID {EnvironmentId}. Status Code: {StatusCode}", environmentId, result.StatusCode);
            return null;
        }

        return await PulseSerializerContext.Default.EnvironmentDeploymentRecords.DeserializeAsync(result, token);
    }

    private async Task<(string? author, string? commitId, string? buildNumber)> GetEnrichments(string project, string team, int buildId, IEnumerable<(string name, string values)> headers, CancellationToken token)
    {
        try
        {
            // Requires Read access to Builds
            string buildUrl = $"https://dev.azure.com/{project}/{team}/_apis/build/builds/{buildId}?api-version=7.1";

            var buildResult = await Send(buildUrl, headers, token);

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
                _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, "Failed to retrieve build enrichments for build ID {BuildId}. Status Code: {StatusCode}", buildId, buildResult.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(PulseEventIds.DevOpsDeploymentAgent, ex, "Error retrieving build enrichments for build ID {BuildId}", buildId);
        }

        return default;
    }
}

public sealed record EnvironmentDeploymentRecords(List<EnvironmentDeploymentRecord>? Value);
public sealed record EnvironmentDeploymentRecord(string Result, DateTimeOffset StartTime, DateTimeOffset? FinishTime, EnvironmentDeploymentOwner Owner, EnvironmentDeploymentDefinition Definition);
public sealed record EnvironmentDeploymentOwner(int? Id);
public sealed record EnvironmentDeploymentDefinition(int? Id);

public sealed record EnvironmentDeploymentBuildRecord(string? SourceVersion, EnvironmentDeploymentBuildRequestedfor? RequestedFor, string? BuildNumber);
public sealed record EnvironmentDeploymentBuildRequestedfor(string? DisplayName, string? UniqueName);
