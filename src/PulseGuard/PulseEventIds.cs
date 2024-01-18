namespace PulseGuard;

public static class PulseEventIds
{
    public static readonly EventId HealthChecks = new(100, nameof(HealthChecks));
    public static readonly EventId HealthApiCheck = new(101, nameof(HealthApiCheck));
    public static readonly EventId StatusCodeCheck = new(102, nameof(StatusCodeCheck));
    public static readonly EventId JsonCheck = new(103, nameof(JsonCheck));
    public static readonly EventId ContainsCheck = new(104, nameof(ContainsCheck));

    public static readonly EventId Webhooks = new(200, nameof(Webhooks));

    public static readonly EventId Store = new(300, nameof(Store));
}
