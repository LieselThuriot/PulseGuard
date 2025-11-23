namespace PulseGuard;

public static partial class PulseEvents
{
    // Store events (300-399)
    [LoggerMessage(EventId = 301, Level = LogLevel.Information, Message = "Empty Sqid found for {Name}, generating new one.")]
    public static partial void EmptySqidFound(this ILogger logger, string name);

    [LoggerMessage(EventId = 302, Level = LogLevel.Information, Message = "Storing pulse report for {Sqid} - {Name}")]
    public static partial void StoringPulseReport(this ILogger logger, string sqid, string name);

    [LoggerMessage(EventId = 303, Level = LogLevel.Information, Message = "Creating new pulse for {Sqid} - {Name}")]
    public static partial void CreatingNewPulse(this ILogger logger, string sqid, string name);

    [LoggerMessage(EventId = 304, Level = LogLevel.Information, Message = "Updating existing pulse for {Sqid} - {Name}")]
    public static partial void UpdatingExistingPulse(this ILogger logger, string sqid, string name);

    [LoggerMessage(EventId = 305, Level = LogLevel.Information, Message = "Updating existing pulse for {Sqid} - {Name} due to state change")]
    public static partial void UpdatingExistingPulseDueToStateChange(this ILogger logger, string sqid, string name);

    [LoggerMessage(EventId = 306, Level = LogLevel.Information, Message = "Creating new pulse for {Name}")]
    public static partial void CreatingNewPulseForName(this ILogger logger, string name);

    [LoggerMessage(EventId = 307, Level = LogLevel.Error, Message = "Failed to store pulse report for {Sqid} - {Name}")]
    public static partial void FailedToStorePulseReport(this ILogger logger, Exception ex, string sqid, string name);

    [LoggerMessage(EventId = 308, Level = LogLevel.Critical, Message = "Pulse {Sqid} has reached the alert threshold with {Count} failures and started at {since}.")]
    public static partial void PulseReachedAlertThreshold(this ILogger logger, string sqid, int count, DateTimeOffset since);

    [LoggerMessage(EventId = 309, Level = LogLevel.Debug, Message = "Failed to append pulse check result for {Sqid} - {Name} -- Creating a new one.")]
    public static partial void FailedToAppendPulseCheckResult(this ILogger logger, Exception ex, string sqid, string name);

    [LoggerMessage(EventId = 310, Level = LogLevel.Information, Message = "Storing agent report for {Sqid} - {Type}")]
    public static partial void StoringAgentReport(this ILogger logger, string sqid, string type);

    [LoggerMessage(EventId = 311, Level = LogLevel.Debug, Message = "Failed to append agent result for {Sqid} - {Type} -- Creating a new one.")]
    public static partial void FailedToAppendAgentResult(this ILogger logger, Exception ex, string sqid, string type);

    [LoggerMessage(EventId = 312, Level = LogLevel.Information, Message = "Storing deployment agent report for {Sqid} - {Type}")]
    public static partial void StoringDeploymentAgentReport(this ILogger logger, string sqid, string type);

    [LoggerMessage(EventId = 313, Level = LogLevel.Error, Message = "Failed to store deployment agent report for {Sqid} - {Type}")]
    public static partial void FailedToStoreDeploymentAgentReport(this ILogger logger, Exception ex, string sqid, string type);

    [LoggerMessage(EventId = 314, Level = LogLevel.Error, Message = "Failed to clean recent pulses")]
    public static partial void FailedToCleanRecentPulses(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 315, Level = LogLevel.Information, Message = "Cleaning up pulse check result for {Sqid}: {Day} ( {Year} )")]
    public static partial void CleaningUpPulseCheckResult(this ILogger logger, string sqid, string day, string year);

    [LoggerMessage(EventId = 316, Level = LogLevel.Error, Message = "Failed to clean up pulses for {day} - {sqid}")]
    public static partial void FailedToCleanUpPulses(this ILogger logger, Exception ex, string day, string sqid);

    [LoggerMessage(EventId = 317, Level = LogLevel.Error, Message = "Failed to clean up pulses")]
    public static partial void FailedToCleanUpPulsesOuter(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 318, Level = LogLevel.Information, Message = "Cleaning up pulse agent result for {Sqid}: {Day} ( {Year} )")]
    public static partial void CleaningUpPulseAgentResult(this ILogger logger, string sqid, string day, string year);

    [LoggerMessage(EventId = 319, Level = LogLevel.Error, Message = "Failed to clean up agents for {day} - {sqid}")]
    public static partial void FailedToCleanUpAgents(this ILogger logger, Exception ex, string day, string sqid);

    [LoggerMessage(EventId = 320, Level = LogLevel.Error, Message = "Failed to clean up agents")]
    public static partial void FailedToCleanUpAgentsOuter(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 321, Level = LogLevel.Warning, Message = "Sqid {Sqid} already exists, generating random one. ( Attempt {attempt} )")]
    public static partial void SqidAlreadyExists(this ILogger logger, Exception ex, string sqid, int attempt);
}