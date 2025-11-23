using PulseGuard.Models;

namespace PulseGuard.Agents.Implementations;

public sealed class ApplicationInsightsAgent(HttpClient client, IReadOnlyList<Entities.PulseAgentConfiguration> options, ILogger<AgentCheck> logger) : AgentCheck(client, options)
{
    private readonly ILogger<AgentCheck> _logger = logger;

    public override async Task<IReadOnlyList<AgentReport>> CheckAsync(CancellationToken token)
    {
        List<AgentReport> result = new(Options.Count);

        foreach (var option in Options)
        {
            result.Add(await Query(option, token));
        }

        return result;
    }

    private async Task<AgentReport> Query(Entities.PulseAgentConfiguration option, CancellationToken token)
    {
        var pulseResponseString = await Post("""
            {
              "query": "performanceCounters | where timestamp >= ago(10m) | where name in ('Available Bytes', 'Private Bytes', '% Processor Time Normalized', 'IO Data Bytes/sec') | project timestamp = todatetime(format_datetime(timestamp, 'yyyy-MM-dd HH:mm')), name, value | evaluate pivot(name, any(value)) | order by timestamp desc | take 1 | project CPU = toreal(['% Processor Time Normalized']), Memory = (toreal(['Private Bytes']) / toreal(['Available Bytes']) * 100), IO = toreal(['IO Data Bytes/sec'])"
            }
            """, option, token);

        string pulseResponse = await pulseResponseString.Content.ReadAsStringAsync(token);

        if (pulseResponse is null)
        {
            _logger.CouldNotReadApplicationInsights();
            return PulseAgentReport.Fail(option);
        }

        ApplicationInsightsQueryResponse? insight = null;

        try
        {
            insight = PulseSerializerContext.Default.ApplicationInsightsQueryResponse.Deserialize(pulseResponse);
        }
        catch (Exception ex)
        {
            _logger.AgentCheckFailedDueToDeserializationError(ex);
        }

        if (insight is null || insight.Tables.Count is 0 || insight.Tables[0].Rows.Count is 0)
        {
            _logger.AgentCheckFailedDueToDeserializationErrorNoEx();
            return PulseAgentReport.Fail(option);
        }

        var row = insight.Tables[0].Rows[0];
        return new PulseAgentReport(option, LargerThanZero(row.ElementAtOrDefault(0)), LargerThanZero(row.ElementAtOrDefault(1)), LargerThanZero(row.ElementAtOrDefault(2)));
    }

    public sealed record ApplicationInsightsQueryResponse(List<ApplicationInsightsQueryResponseTable> Tables);
    public sealed record ApplicationInsightsQueryResponseTable(List<List<double>> Rows);
}
