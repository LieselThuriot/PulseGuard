using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

public sealed class ApplicationInsightsAgent(HttpClient client, Entities.PulseAgentConfiguration options, ILogger<AgentCheck> logger) : AgentCheck(client, options)
{
    private readonly ILogger<AgentCheck> _logger = logger;

    public override async Task<PulseAgentReport> CheckAsync(CancellationToken token)
    {
        var pulseResponseString = await Post("""
            {
              "query": "performanceCounters | where timestamp >= ago(5m) | where name in ('Available Bytes', 'Private Bytes', '% Processor Time Normalized') | order by timestamp desc | project timestamp = todatetime(format_datetime(timestamp, 'yyyy-MM-dd HH:mm')), name, value | evaluate pivot(name, any(value)) | project timestamp, CPU = toreal(['% Processor Time Normalized']), Memory = (toreal(['Private Bytes']) / toreal(['Available Bytes']) * 100) | order by timestamp desc | take 1 | project CPU, Memory"
            }
            """, token);

        string pulseResponse = await pulseResponseString.Content.ReadAsStringAsync(token);

        if (pulseResponse is null)
        {
            _logger.LogWarning(PulseEventIds.ApplicationInsightsAgent, "Could not read application insights");
            return new(Options, null, null);
        }

        ApplicationInsightsQueryResponse? insight = null;

        try
        {
            insight = PulseSerializerContext.Default.ApplicationInsightsQueryResponse.Deserialize(pulseResponse);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(PulseEventIds.ApplicationInsightsAgent, ex, "Agent check failed due to deserialization error");
        }

        if (insight is null || insight.Tables.Count is 0 || insight.Tables[0].Rows.Count is 0)
        {
            _logger.LogWarning(PulseEventIds.ApplicationInsightsAgent, "Agent check failed due to deserialization error");
            return new(Options, null, null);
        }

        var row = insight.Tables[0].Rows[0];
        return new(Options, row[0], row[1]);
    }

    public sealed record ApplicationInsightsQueryResponse(List<Table> Tables);
    public sealed record Table(List<List<double>> Rows);
}
