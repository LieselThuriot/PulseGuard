namespace PulseGuard;

public static partial class PulseEvents
{
    // PulseHostedService events (100-199)
    [LoggerMessage(EventId = 101, Level = LogLevel.Error, Message = "Error checking pulse")]
    public static partial void ErrorCheckingPulse(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 102, Level = LogLevel.Error, Message = "Error checking agent")]
    public static partial void ErrorCheckingAgent(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 103, Level = LogLevel.Error, Message = "Agent timeout")]
    public static partial void AgentTimeout(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 104, Level = LogLevel.Error, Message = "Socket error checking agent")]
    public static partial void SocketErrorCheckingAgent(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 105, Level = LogLevel.Error, Message = "HTTP Error checking agent")]
    public static partial void HttpErrorCheckingAgent(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 106, Level = LogLevel.Error, Message = "Pulse timeout")]
    public static partial void PulseTimeout(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 107, Level = LogLevel.Error, Message = "Socket error checking pulse")]
    public static partial void SocketErrorCheckingPulse(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 108, Level = LogLevel.Error, Message = "HTTP Error checking pulse")]
    public static partial void HttpErrorCheckingPulse(this ILogger logger, Exception ex);
}