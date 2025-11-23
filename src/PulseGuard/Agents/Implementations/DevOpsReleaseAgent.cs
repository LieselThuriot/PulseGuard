using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

/// <summary>
/// For Release pipelines using Stages
/// </summary>
public sealed class DevOpsReleaseAgent(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options, ILogger<AgentCheck> logger) : IAgentCheck
{
    private readonly HttpClient _client = client;
    private readonly IReadOnlyList<PulseAgentConfiguration> _options = options;
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

            try
            {
                await HandleRelease(window, reports, releaseGroup, project, team, releaseId, headers, token);
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

    private async Task<DevOpsReleaseRecords?> GetRelease(string project, string team, string releaseId, IEnumerable<(string name, string values)> headers, CancellationToken token)
    {
        // Requires Read access to Release
        string releaseUrl = $"https://vsrm.dev.azure.com/{project}/{team}/_apis/release/releases?definitionId={releaseId}&queryOrder=descending&$top=5&api-version=7.1";

        HttpResponseMessage result = await Send(releaseUrl, headers, token);

        if (!result.IsSuccessStatusCode)
        {
            _logger.FailedToRetrieveDeploymentRecords(releaseId, (int)result.StatusCode);
            return null;
        }

        return await PulseSerializerContext.Default.DevOpsReleaseRecords.DeserializeAsync(result, token);
    }

    private async Task HandleRelease(DateTimeOffset window, List<AgentReport> reports, IGrouping<(string project, string team, string releaseId, string headers), PulseAgentConfiguration> releaseGroup, string project, string team, string releaseId, string headers, CancellationToken token)
    {
        var headerList = PulseAgentConfiguration.ParseHeaders(headers);

        DevOpsReleaseRecords? response = await GetRelease(project, team, releaseId, headerList, token);

        if (response?.Value is null)
        {
            return;
        }

        foreach (var release in response.Value.Where(x => x.CreatedOn >= window || x.ModifiedOn >= window))
        {
            try
            {
                await HandleReleaseDetails(window, reports, releaseGroup, project, team, release.Id, headerList, token);
            }
            catch (Exception ex)
            {
                _logger.ErrorProcessingReleaseDetails(ex, project, team, releaseId, release.Id.ToString());
            }
        }
    }

    private async Task HandleReleaseDetails(DateTimeOffset window, List<AgentReport> reports, IGrouping<(string project, string team, string releaseId, string headers), PulseAgentConfiguration> releaseGroup, string project, string team, int id, IEnumerable<(string name, string values)> headerList, CancellationToken token)
    {
        // Requires Read access to Release
        string releaseDetailsUrl = $"https://vsrm.dev.azure.com/{project}/{team}/_apis/release/releases/{id}?api-version=7.1";
        HttpResponseMessage result = await Send(releaseDetailsUrl, headerList, token);

        if (!result.IsSuccessStatusCode)
        {
            _logger.FailedToRetrieveReleaseDetails(id.ToString(), (int)result.StatusCode);
            return;
        }

        DevOpsReleaseDetails? details = await PulseSerializerContext.Default.DevOpsReleaseDetails.DeserializeAsync(result, token);

        if (details is null)
        {
            return;
        }

        string? author = details.CreatedBy?.DisplayName;

        var stages = details.Environments.Where(e => e.IsInWindow(window)).ToLookup(x => x.Name);

        var reportsToAdd = releaseGroup.SelectMany(option => stages[option.StageName]
                                                                   .Select(x => (range: x.GetRange(), environment: x))
                                                                   .Where(x => x.range.Start.HasValue)
                                                                   .Select(x => new DeploymentAgentReport(option,
                                                                                                  author,
                                                                                                  x.environment.Status,
                                                                                                  x.range.Start.GetValueOrDefault(),
                                                                                                  x.range.End,
                                                                                                  "Deployment",
                                                                                                  null,
                                                                                                  null
                                                                                     )
                                                                   )
                                                  );

        reports.AddRange(reportsToAdd);
    }
}

public sealed record DevOpsReleaseRecords(IReadOnlyList<DevOpsReleaseRecord>? Value);
public sealed record DevOpsReleaseRecord(int Id, DateTimeOffset CreatedOn, DateTimeOffset ModifiedOn);
public sealed record DevOpsReleaseDetails(DevOpsReleaseDetailsCreatedby CreatedBy, List<DevOpsReleaseDetailsEnvironment> Environments);
public sealed record DevOpsReleaseDetailsCreatedby(string DisplayName);
public sealed record DevOpsReleaseDetailsEnvironment(string Name, string Status, List<DevOpsReleaseDetailsEnvironmentDeploySteps>? DeploySteps)
{
    public bool IsInWindow(DateTimeOffset offset) => Status is not "cancelled" && DeploySteps?.Any(step => step.IsInWindow(offset)) == true;

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