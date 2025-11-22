using Azure.Core;
using PulseGuard.Agents;
using System.Diagnostics.CodeAnalysis;

namespace PulseGuard.Models.Admin;

public sealed class PulseAgentCreationRequest
{
    public required string Location { get; set; }
    public required string ApplicationName { get; set; }

    public string? SubscriptionId { get; set; }
    public int? BuildDefinitionId { get; set; }
    public string? StageName { get; set; }

    public bool Enabled { get; set; } = true;

    public Dictionary<string, string>? Headers { get; set; }

    public bool IsInvalid(string type, [NotNullWhen(true)] out string? result)
    {
        result = null;
        return AgentCheckTypeFastString.FromString(type) switch
        {
            AgentCheckType.WebAppDeployment => HasInvalidSubscription(out result),
            AgentCheckType.DevOpsDeployment => HasInvalidSubscription(out result) || HasInvalidBuildDefinition(out result) || HasInvalidHeaders(out result),
            AgentCheckType.DevOpsRelease => HasInvalidSubscription(out result) || HasInvalidStage(out result) || HasInvalidHeaders(out result),
            _ => false,
        };
    }

    private bool HasInvalidSubscription([NotNullWhen(true)] out string? message)
    {
        if (string.IsNullOrWhiteSpace(SubscriptionId))
        {
            message = "SubscriptionId is required for this type of agent.";
            return true;
        }

        message = null;
        return false;
    }

    private bool HasInvalidBuildDefinition([NotNullWhen(true)] out string? message)
    {
        if (!BuildDefinitionId.HasValue)
        {
            message = "BuildDefinitionId is required for this type of agent.";
            return true;
        }

        message = null;
        return false;
    }

    private bool HasInvalidStage([NotNullWhen(true)] out string? message)
    {
        if (string.IsNullOrEmpty(StageName))
        {
            message = "StageName is required for this type of agent.";
            return true;
        }

        message = null;
        return false;
    }

    private bool HasInvalidHeaders([NotNullWhen(true)] out string? message)
    {
        if (Headers is null || !Headers.TryGetValue("Authorization", out string? authHeader) || string.IsNullOrEmpty(authHeader))
        {
            message = "Authorization header is required for this type of agent.";
            return true;
        }

        message = null;
        return false;
    }
}