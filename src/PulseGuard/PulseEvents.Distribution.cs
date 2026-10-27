namespace PulseGuard;

public static partial class PulseEvents
{
    // Distributed execution events (1200-1299)
    [LoggerMessage(EventId = 1210, Level = LogLevel.Information, Message = "Queued {count} check jobs")]
    public static partial void ScheduledCheckJobs(this ILogger logger, int count);

    [LoggerMessage(EventId = 1211, Level = LogLevel.Error, Message = "Error queueing check job for {partitionKey}/{rowKey}")]
    public static partial void ErrorSendingCheckJob(this ILogger logger, Exception ex, string partitionKey, string rowKey);

    [LoggerMessage(EventId = 1212, Level = LogLevel.Error, Message = "Error scheduling check jobs")]
    public static partial void ErrorSchedulingCheckJobs(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 1213, Level = LogLevel.Warning, Message = "Interval claim {name} is set to {claimed}, ahead of the current interval {interval}. Check instance clocks, or delete the claim row to recover")]
    public static partial void IntervalClaimAhead(this ILogger logger, string name, DateTimeOffset claimed, DateTimeOffset interval);

    [LoggerMessage(EventId = 1220, Level = LogLevel.Error, Message = "Error receiving check jobs")]
    public static partial void ErrorReceivingCheckJobs(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 1221, Level = LogLevel.Error, Message = "Error processing check job {job}")]
    public static partial void ErrorProcessingCheckJob(this ILogger logger, Exception ex, string job);

    [LoggerMessage(EventId = 1224, Level = LogLevel.Error, Message = "Error storing agent report for {sqid} ({type})")]
    public static partial void ErrorStoringAgentReport(this ILogger logger, Exception ex, string sqid, string type);

    [LoggerMessage(EventId = 1240, Level = LogLevel.Error, Message = "Error refreshing live updates")]
    public static partial void ErrorRefreshingLiveUpdates(this ILogger logger, Exception ex);
}
