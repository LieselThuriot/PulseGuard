using Azure.Core;
using Azure.Identity;

namespace PulseGuard.Infrastructure;

internal static class AzureCredential
{
    // One instance so all Azure clients share its token cache. Outside development the app runs with a
    // system-assigned managed identity; skipping the DefaultAzureCredential chain avoids slow failed attempts.
    public static TokenCredential Create(IHostEnvironment environment) =>
        environment.IsDevelopment()
            ? new DefaultAzureCredential()
            : new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);
}
