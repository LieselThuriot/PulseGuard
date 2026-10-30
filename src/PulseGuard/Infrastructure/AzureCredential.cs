using Azure.Core;
using Azure.Identity;

namespace PulseGuard.Infrastructure;

internal static class AzureCredential
{
    // One instance so all Azure clients share its token cache. On App Service, use the managed identity directly
    // (user-assigned when AZURE_CLIENT_ID is set, otherwise system-assigned); skipping the DefaultAzureCredential chain
    // avoids slow failed attempts. Elsewhere, or with a service principal secret, keep the full chain so service
    // principals, workload identity and developer logins keep working.
    public static TokenCredential Create(IConfiguration configuration)
    {
        if (string.IsNullOrEmpty(configuration["WEBSITE_INSTANCE_ID"]) || !string.IsNullOrEmpty(configuration["AZURE_CLIENT_SECRET"]))
        {
            return new DefaultAzureCredential();
        }

        return configuration["AZURE_CLIENT_ID"] is { Length: > 0 } clientId
            ? new ManagedIdentityCredential(ManagedIdentityId.FromUserAssignedClientId(clientId))
            : new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);
    }
}
