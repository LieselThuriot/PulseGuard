using Azure.Core;
using Azure.Data.Tables;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using PulseGuard.Entities;
using PulseGuard.Entities.Serializers;
using TableStorage;

namespace PulseGuard.Infrastructure;

internal static class StorageSetup
{
    private const string StoreName = "PulseStore";

    public static void AddPulseStorage(this IServiceCollection services, IConfiguration configuration, CreateIfNotExistsMode createIfNotExists)
    {
        Action<TableOptions> configureTables = x =>
        {
            x.CreateTableIfNotExists = createIfNotExists;
            x.EnableFluentCompilationAtRuntime();
        };

        Action<BlobOptions> configureBlobs = x =>
        {
            x.CreateContainerIfNotExists = createIfNotExists;
            x.Serializer = new PulseBlobSerializer();
            x.EnableCompilationAtRuntime();
        };

        string? accountName = configuration[StoreName];
        if (!string.IsNullOrWhiteSpace(accountName))
        {
            TokenCredential credential = new DefaultAzureCredential();

            services.AddSingleton(new TableServiceClient(GetServiceUri(accountName, "table"), credential));
            services.AddSingleton(new BlobServiceClient(GetServiceUri(accountName, "blob"), credential));
            services.AddSingleton(new QueueServiceClient(GetServiceUri(accountName, "queue"), credential));

            services.AddPulseContext(configureTables, configureBlobs);
            return;
        }

        string connectionString = configuration.GetConnectionString(StoreName) ?? throw new InvalidOperationException($"Either the '{StoreName}' setting or the '{StoreName}' connection string must be provided.");

        services.AddSingleton(new QueueServiceClient(connectionString));
        services.AddPulseContext(connectionString, configureTables, configureBlobs);
    }

    private static Uri GetServiceUri(string accountName, string service) => new($"https://{accountName}.{service}.core.windows.net");
}
