namespace PulseGuard;

public static partial class PulseEvents
{
    // AdminRoutes events (1000-1099)
    [LoggerMessage(EventId = 1001, Level = LogLevel.Information, Message = "Deleted User {id} with type {type}")]
    public static partial void DeletedUser(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1002, Level = LogLevel.Information, Message = "Updated User {id} {rowtype}")]
    public static partial void UpdatedUser(this ILogger logger, string id, string rowtype);

    [LoggerMessage(EventId = 1003, Level = LogLevel.Error, Message = "Error updating User {id} {rowtype}")]
    public static partial void ErrorUpdatingUser(this ILogger logger, Exception ex, string id, string rowtype);

    [LoggerMessage(EventId = 1004, Level = LogLevel.Information, Message = "Renamed User {id}")]
    public static partial void RenamedUser(this ILogger logger, string id);

    [LoggerMessage(EventId = 1005, Level = LogLevel.Error, Message = "Error renaming User {id}")]
    public static partial void ErrorRenamingUser(this ILogger logger, Exception ex, string id);

    [LoggerMessage(EventId = 1006, Level = LogLevel.Information, Message = "Created User {id} {type}")]
    public static partial void CreatedUser(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1007, Level = LogLevel.Error, Message = "Error creating User {id} {type}")]
    public static partial void ErrorCreatingUser(this ILogger logger, Exception ex, string id, string type);

    [LoggerMessage(EventId = 1008, Level = LogLevel.Information, Message = "Updated Pulse Entry {Id} to Group: {Group}, Name: {Name}")]
    public static partial void UpdatedPulseEntry(this ILogger logger, string id, string group, string name);

    [LoggerMessage(EventId = 1009, Level = LogLevel.Information, Message = "Deleted Webhook Entry {Id}")]
    public static partial void DeletedWebhookEntry(this ILogger logger, string id);

    [LoggerMessage(EventId = 1010, Level = LogLevel.Information, Message = "Updated Webhook Entry {Id}")]
    public static partial void UpdatedWebhookEntry(this ILogger logger, string id);

    [LoggerMessage(EventId = 1011, Level = LogLevel.Error, Message = "Error updating Webhook Entry {Id}")]
    public static partial void ErrorUpdatingWebhookEntry(this ILogger logger, Exception ex, string id);

    [LoggerMessage(EventId = 1012, Level = LogLevel.Information, Message = "Created Webhook Entry {Id}")]
    public static partial void CreatedWebhookEntry(this ILogger logger, string id);

    [LoggerMessage(EventId = 1013, Level = LogLevel.Error, Message = "Error creating Webhook Entry")]
    public static partial void ErrorCreatingWebhookEntry(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 1014, Level = LogLevel.Information, Message = "Updated Agent Configuration {Id} of type {Type} to Enabled: {Enabled}")]
    public static partial void UpdatedAgentConfigurationEnabled(this ILogger logger, string id, string type, bool enabled);

    [LoggerMessage(EventId = 1015, Level = LogLevel.Error, Message = "Error updating Agent Configuration {Id} of type {Type} to Enabled: {Enabled}")]
    public static partial void ErrorUpdatingAgentConfigurationEnabled(this ILogger logger, Exception ex, string id, string type, bool enabled);

    [LoggerMessage(EventId = 1016, Level = LogLevel.Information, Message = "Created Agent Configuration {Id} of type {Type}")]
    public static partial void CreatedAgentConfiguration(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1017, Level = LogLevel.Error, Message = "Error creating Agent Configuration {Id} of type {Type}")]
    public static partial void ErrorCreatingAgentConfiguration(this ILogger logger, Exception ex, string id, string type);

    [LoggerMessage(EventId = 1018, Level = LogLevel.Information, Message = "Updated Agent Configuration {Id} of type {Type}")]
    public static partial void UpdatedAgentConfiguration(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1019, Level = LogLevel.Error, Message = "Error updating Agent Configuration {Id} of type {Type}")]
    public static partial void ErrorUpdatingAgentConfiguration(this ILogger logger, Exception ex, string id, string type);

    // Additional Admin events
    [LoggerMessage(EventId = 1020, Level = LogLevel.Information, Message = "Deleted Agent Configuration {Id} of type {Type}")]
    public static partial void DeletedAgentConfiguration(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1021, Level = LogLevel.Information, Message = "Created Normal Configuration {Id} of type {Type}")]
    public static partial void CreatedNormalConfiguration(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1022, Level = LogLevel.Error, Message = "Error creating Normal Configuration")]
    public static partial void ErrorCreatingNormalConfiguration(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 1023, Level = LogLevel.Information, Message = "Updated Normal Configuration {Id} of type {Type}")]
    public static partial void UpdatedNormalConfiguration(this ILogger logger, string id, string type);

    [LoggerMessage(EventId = 1024, Level = LogLevel.Error, Message = "Error updating Normal Configuration {Id} of type {Type}")]
    public static partial void ErrorUpdatingNormalConfiguration(this ILogger logger, Exception ex, string id, string type);

    [LoggerMessage(EventId = 1025, Level = LogLevel.Information, Message = "Updated Normal Configuration {Id} to Enabled: {Enabled}")]
    public static partial void UpdatedNormalConfigurationEnabled(this ILogger logger, string id, bool enabled);

    [LoggerMessage(EventId = 1026, Level = LogLevel.Error, Message = "Error updating Normal Configuration {Id} to Enabled: {Enabled}")]
    public static partial void ErrorUpdatingNormalConfigurationEnabled(this ILogger logger, Exception ex, string id, bool enabled);

    [LoggerMessage(EventId = 1027, Level = LogLevel.Information, Message = "Deleted Normal Configuration {Id}")]
    public static partial void DeletedNormalConfiguration(this ILogger logger, string id);
}