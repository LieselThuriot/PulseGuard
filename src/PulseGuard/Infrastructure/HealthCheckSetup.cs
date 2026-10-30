using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using PulseGuard.Entities;
using TableStorage.Linq;

namespace PulseGuard.Infrastructure;

internal static class HealthCheckSetup
{
    public const string WarmupPath = "/warmup";

    public static void AddPulseHealthChecks(this IServiceCollection services)
    {
        services.AddHealthChecks()
                .AddCheck<DataProtectionWarmupCheck>("data-protection")
                .AddCheck<TableStorageWarmupCheck>("table-storage");
    }

    // Loads the key ring: reads keys.xml from Blob storage, gets a managed identity token and unwraps the key in Key Vault.
    private sealed class DataProtectionWarmupCheck(IDataProtectionProvider provider) : IHealthCheck
    {
        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            provider.CreateProtector(nameof(DataProtectionWarmupCheck)).Protect([0]);
            return Task.FromResult(HealthCheckResult.Healthy());
        }
    }

    private sealed class TableStorageWarmupCheck(IServiceScopeFactory scopeFactory) : IHealthCheck
    {
        public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
        {
            await using AsyncServiceScope scope = scopeFactory.CreateAsyncScope();
            PulseContext pulseContext = scope.ServiceProvider.GetRequiredService<PulseContext>();
            _ = await pulseContext.Configurations.FirstOrDefaultAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
    }
}
