namespace PulseGuard;

public static partial class PulseEvents
{
    // HealthRoutes events
    [LoggerMessage(EventId = 1100, Level = LogLevel.Error, Message = "Failed health checks")]
    public static partial void FailedHealthChecks(this ILogger logger, Exception ex);
}
