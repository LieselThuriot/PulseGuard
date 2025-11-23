namespace PulseGuard;

public static partial class PulseEvents
{
    // Agent events
    [LoggerMessage(EventId = 150, Level = LogLevel.Warning, Message = "Could not read application insights")]
    public static partial void CouldNotReadApplicationInsights(this ILogger logger);

    [LoggerMessage(EventId = 151, Level = LogLevel.Warning, Message = "Agent check failed due to deserialization error")]
    public static partial void AgentCheckFailedDueToDeserializationError(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 152, Level = LogLevel.Warning, Message = "Agent check failed due to deserialization error")]
    public static partial void AgentCheckFailedDueToDeserializationErrorNoEx(this ILogger logger);

    [LoggerMessage(EventId = 153, Level = LogLevel.Warning, Message = "Agent check failed")]
    public static partial void AgentCheckFailed(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 154, Level = LogLevel.Error, Message = "Web App not found: {ResourceId}")]
    public static partial void WebAppNotFound(this ILogger logger, string resourceId);

    [LoggerMessage(EventId = 155, Level = LogLevel.Error, Message = "Error checking deployment agent")]
    public static partial void ErrorCheckingDeploymentAgent(this ILogger logger, Exception ex);

    [LoggerMessage(EventId = 156, Level = LogLevel.Warning, Message = "Failed to deserialize deployment message: {Message}")]
    public static partial void FailedToDeserializeDeploymentMessage(this ILogger logger, Exception ex, string message);

    [LoggerMessage(EventId = 157, Level = LogLevel.Error, Message = "Error processing deployments for project {Project}, team {Team}, release ID {ReleaseId}")]
    public static partial void ErrorProcessingDeployments(this ILogger logger, Exception ex, string project, string team, string releaseId);

    [LoggerMessage(EventId = 158, Level = LogLevel.Error, Message = "Failed to retrieve deployment records for release ID {ReleaseId}. Status Code: {StatusCode}")]
    public static partial void FailedToRetrieveDeploymentRecords(this ILogger logger, string releaseId, int statusCode);

    [LoggerMessage(EventId = 159, Level = LogLevel.Error, Message = "Error processing release details for project {Project}, team {Team}, release ID {ReleaseId}, release {ReleaseRecordId}")]
    public static partial void ErrorProcessingReleaseDetails(this ILogger logger, Exception ex, string project, string team, string releaseId, string releaseRecordId);

    [LoggerMessage(EventId = 160, Level = LogLevel.Error, Message = "Failed to retrieve release details for release ID {ReleaseId}. Status Code: {StatusCode}")]
    public static partial void FailedToRetrieveReleaseDetails(this ILogger logger, string releaseId, int statusCode);

    [LoggerMessage(EventId = 161, Level = LogLevel.Error, Message = "Error processing deployments for project {Project}, team {Team}, environment ID {EnvironmentId}")]
    public static partial void ErrorProcessingDeploymentsDevOps(this ILogger logger, Exception ex, string project, string team, string environmentId);

    [LoggerMessage(EventId = 162, Level = LogLevel.Error, Message = "Failed to retrieve deployment records for environment ID {EnvironmentId}. Status Code: {StatusCode}")]
    public static partial void FailedToRetrieveDeploymentRecordsDevOps(this ILogger logger, string environmentId, int statusCode);

    [LoggerMessage(EventId = 163, Level = LogLevel.Error, Message = "Failed to retrieve build enrichments for build ID {BuildId}. Status Code: {StatusCode}")]
    public static partial void FailedToRetrieveBuildEnrichments(this ILogger logger, string buildId, int statusCode);

    [LoggerMessage(EventId = 164, Level = LogLevel.Error, Message = "Error retrieving build enrichments for build ID {BuildId}")]
    public static partial void ErrorRetrievingBuildEnrichments(this ILogger logger, Exception ex, string buildId);
}