using Azure;
using Azure.Identity;
using Azure.Monitor.Query.Logs;
using Azure.Monitor.Query.Logs.Models;
using PulseGuard.Entities;
using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

public sealed class LogAnalyticsWorkspaceAgent(HttpClient client, IReadOnlyList<PulseAgentConfiguration> options, ILogger<AgentCheck> logger) : AgentCheck(client, options)
{
    private readonly ILogger<AgentCheck> _logger = logger;

    public override async Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token)
    {
        try
        {
            DefaultAzureCredential credential = new();
            LogsQueryClient client = new(credential);

            DateTimeOffset now = DateTimeOffset.UtcNow;
            LogsQueryTimeRange timeRange = new(now.AddMinutes(-10), now);

            LogsQueryOptions options = new()
            {
                ServerTimeout = TimeSpan.FromMinutes(1)
            };

            string query = $$"""
            let apps = datatable(AppRoleName:string)
            [
                {{string.Join(", ", Options.Select(x => "'" + x.ApplicationName + "'"))}}
            ];
            AppPerformanceCounters
            | where TimeGenerated >= ago(10m)
            | join kind=inner (apps) on AppRoleName
            | where Name in ('Available Bytes', 'Private Bytes', '% Processor Time Normalized', 'IO Data Bytes/sec')
            | project AppRoleName, TimeGenerated = todatetime(format_datetime(TimeGenerated, 'yyyy-MM-dd HH:mm')), Name, Value
            | evaluate pivot(Name, any(Value))
            | summarize arg_max(TimeGenerated, *) by AppRoleName
            | project AppRoleName, CPU = toreal(['% Processor Time Normalized']), Memory = (toreal(['Private Bytes']) / toreal(['Available Bytes']) * 100), IO = toreal(['IO Data Bytes/sec'])
            """;
            
            string workspaceId = Options[0].Location;
            Response<LogsQueryResult> result = await client.QueryWorkspaceAsync(workspaceId, query, timeRange, options, token);

            if (result.Value?.AllTables is not null && result.Value.AllTables.Count is not 0)
            {
                List<PulseAgentReport> reports = new(Options.Count);
                                
                foreach (LogsTableRow row in result.Value.AllTables[0].Rows)
                {
                    PulseAgentConfiguration configuration = Options.First(x => x.ApplicationName == row.GetString("AppRoleName"));
                    reports.Add(new(configuration, LargerThanZero(row.GetDouble("CPU")), LargerThanZero(row.GetDouble("Memory")), LargerThanZero(row.GetDouble("IO"))));
                }

                return reports;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(PulseEventIds.LogAnalyticsWorkspaceAgent, ex, "Agent check failed");
        }

        return PulseAgentReport.Fail(Options);
    }
}
