using Azure.Core;
using Azure.Storage.Blobs;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;
using PulseGuard.Models;

namespace PulseGuard.Infrastructure;

internal static class DataProtectionSetup
{
    private const string ApplicationName = "PulseGuard";

    public static void AddPulseDataProtection(this IServiceCollection services, IConfiguration configuration)
    {
        IDataProtectionBuilder dataProtection = services.AddDataProtection()
                                                        .SetApplicationName(ApplicationName);

        // Without shared key storage, keys stay in the default (per host or per App Service slot) location.
        if (!configuration.GetSection(PulseDataProtectionOptions.SectionName).Exists())
        {
            return;
        }

        services.AddOptions<PulseDataProtectionOptions>()
                .BindConfiguration(PulseDataProtectionOptions.SectionName)
                .ValidateDataAnnotations()
                .Validate(x => x.BlobUri is { IsAbsoluteUri: true, Scheme: "https" } && x.KeyId is { IsAbsoluteUri: true, Scheme: "https" },
                          "DataProtection:BlobUri and DataProtection:KeyId must be absolute HTTPS URLs.")
                .ValidateOnStart();

        dataProtection.PersistKeysToAzureBlobStorage(sp => new BlobClient(sp.GetRequiredService<IOptions<PulseDataProtectionOptions>>().Value.BlobUri,
                                                                          sp.GetRequiredService<TokenCredential>()))
                      .ProtectKeysWithAzureKeyVault(sp => sp.GetRequiredService<IOptions<PulseDataProtectionOptions>>().Value.KeyId,
                                                    sp => sp.GetRequiredService<TokenCredential>());
    }
}
