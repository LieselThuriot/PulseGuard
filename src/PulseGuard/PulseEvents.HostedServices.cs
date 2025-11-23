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

    // AsyncPulseStoreHostedService events (201)
    [LoggerMessage(EventId = 201, Level = LogLevel.Error, Message = "Error checking pulses")]
    public static partial void ErrorCheckingPulses(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 202, Level = LogLevel.Error, Message = "Error storing pulses for message {id}")]
    public static partial void ErrorStoringPulses(this ILogger logger, Exception ex, string id);

    [LoggerMessage(EventId = 203, Level = LogLevel.Warning, Message = "Unknown agent report type for message {id}: {type}")]
    public static partial void UnknownAgentReportType(this ILogger logger, string id, string? type);
}