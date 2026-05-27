namespace PulseGuard.Agents;

internal static class AgentConstants
{
    /// <summary>
    /// Deployment Window in hours, how far back to look for deployments/releases
    /// </summary>
    public static DateTimeOffset GetDeploymentWindow() => DateTimeOffset.UtcNow.AddHours(-2);
}
