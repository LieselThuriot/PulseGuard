namespace PulseGuard;

public static partial class PulseEvents
{
    // WebhookService events (200-299, but using 400+ to avoid conflict)
    [LoggerMessage(EventId = 401, Level = LogLevel.Error, Message = "Failed to deserialize webhook event message {MessageId} and {Body}")]
    public static partial void FailedToDeserializeWebhookEvent(this ILogger logger, Exception ex, string messageId, string body);

    // WebhookHostedService events
    [LoggerMessage(EventId = 402, Level = LogLevel.Error, Message = "Error checking webhooks")]
    public static partial void ErrorCheckingWebhooks(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 403, Level = LogLevel.Warning, Message = "Unknown webhook event type for message {id}")]
    public static partial void UnknownWebhookEventType(this ILogger logger, string id);

    [LoggerMessage(EventId = 404, Level = LogLevel.Error, Message = "Error handling webhook for message {id}")]
    public static partial void ErrorHandlingWebhook(this ILogger logger, Exception ex, string id);

    [LoggerMessage(EventId = 405, Level = LogLevel.Debug, Message = "Sent webhook {Webhook}")]
    public static partial void SentWebhook(this ILogger logger, string webhook);

    [LoggerMessage(EventId = 406, Level = LogLevel.Error, Message = "Error sending webhook {Webhook}: {StatusCode}")]
    public static partial void ErrorSendingWebhookWithStatus(this ILogger logger, string webhook, int statusCode);

    [LoggerMessage(EventId = 407, Level = LogLevel.Error, Message = "Error sending webhook {Webhook}")]
    public static partial void ErrorSendingWebhook(this ILogger logger, Exception ex, string webhook);
}