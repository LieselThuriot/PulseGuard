namespace PulseGuard;

public static class PulseEventIds
{
    public static readonly EventId HealthChecks = new(100, nameof(HealthChecks));

    public static readonly EventId HealthApiCheck = new(101, nameof(HealthApiCheck));
    public static readonly EventId StatusCodeCheck = new(102, nameof(StatusCodeCheck));
    public static readonly EventId JsonCheck = new(103, nameof(JsonCheck));
    public static readonly EventId ContainsCheck = new(104, nameof(ContainsCheck));

    public static readonly EventId ApplicationInsightsAgent = new(150, nameof(ApplicationInsightsAgent));
    public static readonly EventId LogAnalyticsWorkspaceAgent = new(151, nameof(LogAnalyticsWorkspaceAgent));
    public static readonly EventId WebAppDeploymentAgent = new(152, nameof(WebAppDeploymentAgent));
    public static readonly EventId DevOpsDeploymentAgent = new(153, nameof(DevOpsDeploymentAgent));

    public static readonly EventId Webhooks = new(200, nameof(Webhooks));
    public static readonly EventId Pulses = new(201, nameof(Pulses));

    public static readonly EventId Store = new(300, nameof(Store));
    
    public static readonly EventId Admin = new(1000, nameof(Admin));
}
