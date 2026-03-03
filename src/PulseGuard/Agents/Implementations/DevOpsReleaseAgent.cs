using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;

namespace PulseGuard.Agents.Implementations;

/// <summary>
/// For Release pipelines using Stages
/// </summary>
public sealed class DevOpsReleaseAgent(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options, AuthHeader? authorization, ILogger<AgentCheck> logger) : IAgentCheck
{
    private readonly HttpClient _client = client;
    private readonly IReadOnlyList<PulseAgentConfiguration> _options = options;
    private readonly AuthHeader? _authorization = authorization;
    private readonly ILogger<AgentCheck> _logger = logger;

    public Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token)
    {
        DateTimeOffset window = DateTimeOffset.UtcNow.AddHours(-1);
        return IterateReleases(window, token);
    }

    private async Task<IReadOnlyList<AgentReport>> IterateReleases(DateTimeOffset window, CancellationToken token)
    {
        List<AgentReport> reports = [];

        foreach (var releaseGroup in _options.GroupBy(o => (project: o.Location, team: o.ApplicationName, releaseId: o.SubscriptionId, headers: o.Headers)))
        {
            var (project, team, releaseId, headers) = releaseGroup.Key;
            var headerList = PulseAgentConfiguration.ParseHeaders(headers);

            if (_authorization is not null)
            {
                headerList = headerList.Append((_authorization.Header, _authorization.Value));
            }

            try
            {
                await HandleRelease(window, reports, releaseGroup, project, team, releaseId, headerList, token);
            }
            catch (Exception ex)
            {
                _logger.ErrorProcessingDeployments(ex, project, team, releaseId);
            }
        }

        return reports;
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

    private async Task<DevOpsReleaseDeployments?> GetRelease(string project, string team, string releaseId, IEnumerable<(string name, string values)> headers, CancellationToken token)
    {
        // Requires Read access to Release
        string releaseUrl = $"https://vsrm.dev.azure.com/{project}/{team}/_apis/release/deployments?definitionId={releaseId}&latestAttemptsOnly=true&queryOrder=descending&$top=5&api-version=7.1";

        HttpResponseMessage result = await Send(releaseUrl, headers, token);

        if (!result.IsSuccessStatusCode)
        {
            _logger.FailedToRetrieveDeploymentRecords(releaseId, (int)result.StatusCode);
            return null;
        }

        return await PulseSerializerContext.Default.DevOpsReleaseDeployments.DeserializeAsync(result, token);
    }

    private async Task HandleRelease(DateTimeOffset window, List<AgentReport> reports, IGrouping<(string project, string team, string releaseId, string headers), PulseAgentConfiguration> releaseGroup, string project, string team, string releaseId, IEnumerable<(string name, string values)> headerList, CancellationToken token)
    {
        DevOpsReleaseDeployments? response = await GetRelease(project, team, releaseId, headerList, token);

        if (response?.Value is null)
        {
            return;
        }

        var releases = response.GetRelevantItems().ToLookup(x => x.ReleaseEnvironment.Name, StringComparer.OrdinalIgnoreCase);

        foreach (var entry in releaseGroup)
        {
            foreach (var release in releases[entry.StageName])
            {
                try
                {
                    DeploymentAgentReport? report = await HandleReleaseDetails(entry, window, release.ReleaseEnvironment, headerList, token);

                    if (report is not null)
                    {
                        reports.Add(report);
                    }
                }
                catch (Exception ex)
                {
                    _logger.ErrorProcessingReleaseDetails(ex, project, team, releaseId, release.Id.ToString());
                }
            }
        }
    }

    private async Task<DeploymentAgentReport?> HandleReleaseDetails(PulseAgentConfiguration option, DateTimeOffset window, DevOpsReleaseDeploymentEnvironment release, IEnumerable<(string name, string values)> headerList, CancellationToken token)
    {
        // Requires Read access to Release
        HttpResponseMessage result = await Send(release.Url, headerList, token);

        if (!result.IsSuccessStatusCode)
        {
            _logger.FailedToRetrieveReleaseDetails(release.Url, (int)result.StatusCode);
            return null;
        }

        DevOpsReleaseDetailsEnvironment? details = await PulseSerializerContext.Default.DevOpsReleaseDetailsEnvironment.DeserializeAsync(result, token);

        if (details?.IsInWindow(window) != true)
        {
            return null;
        }

        (DateTimeOffset? start, DateTimeOffset? end) = details.GetRange();

        if (!start.HasValue)
        {
            return null;
        }

        return new(option,
                   details.ReleaseCreatedBy?.DisplayName,
                   details.Status,
                   start.GetValueOrDefault(),
                   end,
                   "Deployment",
                   null,
                   null);
    }
}

// Releases
public sealed record DevOpsReleaseDeployments(List<DevOpsReleaseDeploymentItem> Value)
{
    public IEnumerable<DevOpsReleaseDeploymentItem> GetRelevantItems() => Value?.Where(x => x.IsInteresting()) ?? [];
}

public sealed record DevOpsReleaseDeploymentItem(int Id, string DeploymentStatus, DevOpsReleaseDeploymentEnvironment ReleaseEnvironment)
{
    public bool IsInteresting() => DeploymentStatus is not ("notDeployed" or "inProgress") && ReleaseEnvironment is not null;
}

public sealed record DevOpsReleaseDeploymentEnvironment(string Name, string Url);

// Environment Details
public sealed record DevOpsReleaseDetailsEnvironment(string Status, DevOpsReleaseEnvironmentCreatedBy ReleaseCreatedBy, List<DevOpsReleaseDetailsEnvironmentDeploySteps>? DeploySteps)
{
    public bool IsInWindow(DateTimeOffset offset) => Status is not ("inProgress" or "cancelled") && DeploySteps?.Any(step => step.IsInWindow(offset)) == true;

    public (DateTimeOffset? Start, DateTimeOffset? End) GetRange()
    {
        var jobs = DeploySteps?.SelectMany(x => x.ReleaseDeployPhases ?? [])
                               .SelectMany(x => x.DeploymentJobs ?? [])
                               .Where(x => x.Job is not null)
                               .Select(x => x.Job!)
                               .ToList() ?? [];

        if (jobs.Count is 0)
        {
            return (null, null);
        }

        DateTimeOffset start = jobs[0].StartTime;
        DateTimeOffset? end = jobs[^1].FinishTime;

        return (start, end);
    }
}

public sealed record DevOpsReleaseEnvironmentCreatedBy(string DisplayName);

public sealed record DevOpsReleaseDetailsEnvironmentDeploySteps(List<DevOpsReleaseDetailsEnvironmentReleaseDeployPhases>? ReleaseDeployPhases)
{
    public bool IsInWindow(DateTimeOffset offset) => ReleaseDeployPhases?.Any(phase => phase.IsInWindow(offset)) == true;
}

public sealed record DevOpsReleaseDetailsEnvironmentReleaseDeployPhases(List<DevOpsReleaseDetailsEnvironmentDeploymentJobs>? DeploymentJobs)
{
    public bool IsInWindow(DateTimeOffset offset) => DeploymentJobs?.Any(job => job.IsInWindow(offset)) == true;
}

public sealed record DevOpsReleaseDetailsEnvironmentDeploymentJobs(DevOpsReleaseDetailsEnvironmentDeploymentJob? Job)
{
    public bool IsInWindow(DateTimeOffset offset) => Job is not null && Job.StartTime >= offset;
}

public sealed record DevOpsReleaseDetailsEnvironmentDeploymentJob(DateTimeOffset StartTime, DateTimeOffset? FinishTime);