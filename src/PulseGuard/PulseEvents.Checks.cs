namespace PulseGuard;

public static partial class PulseEvents
{
    // Check events
    [LoggerMessage(EventId = 101, Level = LogLevel.Warning, Message = "Pulse check failed with null response")]
    public static partial void PulseCheckFailedWithNullResponse(this ILogger logger);

    [LoggerMessage(EventId = 102, Level = LogLevel.Warning, Message = "Pulse check failed due to unknown health response")]
    public static partial void PulseCheckFailedDueToUnknownHealthResponse(this ILogger logger);

    [LoggerMessage(EventId = 103, Level = LogLevel.Information, Message = "Pulse check completed and is considered {HealthState}")]
    public static partial void PulseCheckCompleted(this ILogger logger, string healthState);

    [LoggerMessage(EventId = 104, Level = LogLevel.Warning, Message = "Pulse check failed with status code {StatusCode}")]
    public static partial void PulseCheckFailedWithStatusCode(this ILogger logger, int statusCode);

    [LoggerMessage(EventId = 105, Level = LogLevel.Warning, Message = "Failed to read response body")]
    public static partial void FailedToReadResponseBody(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 106, Level = LogLevel.Information, Message = "Pulse check completed and is considered healthy")]
    public static partial void PulseCheckCompletedHealthy(this ILogger logger);

    [LoggerMessage(EventId = 107, Level = LogLevel.Warning, Message = "Pulse check failed due to deserialization error")]
    public static partial void PulseCheckFailedDueToDeserializationError(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 110, Level = LogLevel.Warning, Message = "Pulse check failed due to deserialization error")]
    public static partial void PulseCheckFailedDueToDeserializationErrorNoEx(this ILogger logger);

    [LoggerMessage(EventId = 108, Level = LogLevel.Warning, Message = "Pulse check failed due to mismatched JSON")]
    public static partial void PulseCheckFailedDueToMismatchedJson(this ILogger logger);

    [LoggerMessage(EventId = 109, Level = LogLevel.Warning, Message = "Pulse check failed due to mismatched page content")]
    public static partial void PulseCheckFailedDueToMismatchedPageContent(this ILogger logger);
}