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

            QueryTimeRange timeRange = TimeSpan.FromMinutes(5);

            LogsQueryOptions options = new()
            {
                ServerTimeout = TimeSpan.FromMinutes(1)
            };

            string query = $$"""
            AppPerformanceCounters
            | where AppRoleName == '{{Options.ApplicationName}}'
            | where TimeGenerated >= ago(5m)
            | order by TimeGenerated desc
            | where Name == 'Available Bytes' or Name == 'Private Bytes' or Name == '% Processor Time Normalized'
            | project TimeGenerated = todatetime(format_datetime(TimeGenerated, 'yyyy-MM-dd HH:mm')), Name, Value
            | evaluate pivot(Name, any(Value))
            | extend ['% Memory'] = (toreal(['Private Bytes']) / toreal(['Available Bytes']) * 100)
            | project TimeGenerated, CPU = toreal(['% Processor Time Normalized']), Memory = (toreal(['Private Bytes']) / toreal(['Available Bytes']) * 100)
            """;
            
            string workspaceId = Options.Location;
            Response<LogsQueryResult> result = await client.QueryWorkspaceAsync(workspaceId, query, timeRange, options, token);

            if (result.Value?.AllTables is not null && result.Value.AllTables.Count is not 0)
            {
                var rows = result.Value.AllTables[0].Rows;
                if (rows.Count is not 0)
                {
                    var row = rows[0];
                    return new(Options, row.GetDouble("CPU"), row.GetDouble("Memory"));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(PulseEventIds.ApplicationInsightsAgent, ex, "Agent check failed due to deserialization error");
        }

        return new(Options, null, null);
    }
}
