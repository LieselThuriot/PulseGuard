using Azure;
using Azure.Identity;
using Azure.Monitor.Query;
using Azure.Monitor.Query.Models;
using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

public sealed class LogAnalyticsWorkspaceAgent(HttpClient client, Entities.PulseAgentConfiguration options, ILogger<AgentCheck> logger) : AgentCheck(client, options)
{
    private readonly ILogger<AgentCheck> _logger = logger;

    public override async Task<PulseAgentReport> CheckAsync(CancellationToken token)
    {
        try
        {
            DefaultAzureCredential credential = new();
            LogsQueryClient client = new(credential);

            DateTimeOffset now = DateTimeOffset.UtcNow;
            QueryTimeRange timeRange = new(now.AddMinutes(-10), now);

            LogsQueryOptions options = new()
            {
                ServerTimeout = TimeSpan.FromMinutes(1)
            };

            string query = $$"""
            AppPerformanceCounters
            | where TimeGenerated >= ago(10m)
            | where AppRoleName == '{{Options.ApplicationName}}'
            | where Name in ('Available Bytes', 'Private Bytes', '% Processor Time Normalized', 'IO Data Bytes/sec')
            | project TimeGenerated = todatetime(format_datetime(TimeGenerated, 'yyyy-MM-dd HH:mm')), Name, Value
            | evaluate pivot(Name, any(Value))
            | order by TimeGenerated desc
            | take 1
            | project CPU = toreal(['% Processor Time Normalized']), Memory = (toreal(['Private Bytes']) / toreal(['Available Bytes']) * 100), IO = toreal(['IO Data Bytes/sec'])
            """;
            
            string workspaceId = Options.Location;
            Response<LogsQueryResult> result = await client.QueryWorkspaceAsync(workspaceId, query, timeRange, options, token);

            if (result.Value?.AllTables is not null && result.Value.AllTables.Count is not 0)
            {
                IReadOnlyList<LogsTableRow> rows = result.Value.AllTables[0].Rows;
                if (rows.Count is not 0)
                {
                    LogsTableRow row = rows[0];
                    return new(Options, LargerThanZero(row.GetDouble("CPU")), LargerThanZero(row.GetDouble("Memory")), LargerThanZero(row.GetDouble("IO")));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(PulseEventIds.ApplicationInsightsAgent, ex, "Agent check failed due to deserialization error");
        }

        return PulseAgentReport.Fail(Options);
    }
}
