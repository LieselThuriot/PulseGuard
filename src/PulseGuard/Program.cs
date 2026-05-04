using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.ResponseCompression;
using PulseGuard;
using PulseGuard.Entities;
using PulseGuard.Entities.Serializers;
using PulseGuard.Infrastructure;
using PulseGuard.Models;
using PulseGuard.Routes;
using PulseGuard.Services;
using System.IO.Compression;
using System.Text.Json.Serialization;
using TableStorage;

var builder = WebApplication.CreateBuilder(args);

string storeConnectionString = builder.Configuration.GetConnectionString("PulseStore") ?? throw new NullReferenceException("PulseStore");
builder.Services.Configure<PulseOptions>(builder.Configuration.GetSection("pulse"))
                .PostConfigure<PulseOptions>(options => options.Store = storeConnectionString);

builder.Services.Configure<EncryptionOptions>(builder.Configuration.GetSection("encryption"))
                .PostConfigure<EncryptionOptions>(options =>
                {
                    if (string.IsNullOrEmpty(options.Password))
                    {
                        throw new InvalidOperationException("Encryption password must be provided.");
                    }
                });

builder.Services.Configure<BrotliCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(options => options.Level = CompressionLevel.Fastest);

var createIfNotExists = builder.Environment.IsDevelopment() ? CreateIfNotExistsMode.Once : CreateIfNotExistsMode.Disabled;
builder.Services.AddPulseContext(storeConnectionString,
    x =>
    {
        x.CreateTableIfNotExists = createIfNotExists;
        x.EnableFluentCompilationAtRuntime();
    },
    x =>
    {
        x.CreateContainerIfNotExists = createIfNotExists;
        x.Serializer = new PulseBlobSerializer();
        x.EnableCompilationAtRuntime();
    }
);

bool authorized = builder.Services.ConfigureAuthentication(builder.Configuration);
builder.Services.ConfigurePulseTelemetry(builder.Configuration);

builder.Services.ConfigureHttpJsonOptions(x =>
{
    x.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    x.SerializerOptions.TypeInfoResolverChain.Insert(0, PulseSerializerContext.Default);
});

builder.Services.ConfigurePulseHttpClients();
builder.Services.ConfigurePulseServices();

builder.Services.AddOpenApi();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddHttpForwarder();
}

builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.All;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = [.. ResponseCompressionDefaults.MimeTypes, ProtoResult.ProtoContentType];
});

var app = builder.Build();

app.UseResponseCompression();
app.UseForwardedHeaders();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

string? pathBase = app.Configuration["PathBase"];
if (!string.IsNullOrEmpty(pathBase))
{
    app.UsePathBase(pathBase);
}

app.UseRouting();
app.MapRoutes(authorized);

// only once
// {

//     var scope = app.Services.CreateScope();
//     var context = scope.ServiceProvider.GetRequiredService<PulseContext>();

//     await foreach (var results in context.ArchivedPulseCheckResults)
//     {
//         List<Heatmap> maps = [];

//         foreach (var pulses in results.Items.GroupBy(x => DateTimeOffset.FromUnixTimeSeconds(x.Timestamp).ToString(PulseCheckResult.PartitionKeyFormat)))
//         {
//             var counter = pulses.CountBy(x => x.State).ToList();
//             int GetValueOrDefault(PulseStates key) => counter.FirstOrDefault(x => x.Key == key).Value;

//             Heatmap heatmap = new()
//             {
//                 Sqid = results.Sqid,
//                 Day = pulses.Key,
//                 Unknown = GetValueOrDefault(PulseStates.Unknown),
//                 Healthy = GetValueOrDefault(PulseStates.Healthy),
//                 Degraded = GetValueOrDefault(PulseStates.Degraded),
//                 Unhealthy = GetValueOrDefault(PulseStates.Unhealthy),
//                 TimedOut = GetValueOrDefault(PulseStates.TimedOut),
//             };

//             maps.Add(heatmap);
//         }

//         await context.Heatmaps.BulkUpsertAsync(maps, default);
//     }

//     await foreach (var results in context.PulseCheckResults)
//     {
//         List<Heatmap> maps = [];

//         foreach (var pulses in results.Items.GroupBy(x => DateTimeOffset.FromUnixTimeSeconds(x.Timestamp).ToString(PulseCheckResult.PartitionKeyFormat)))
//         {
//             var counter = pulses.CountBy(x => x.State).ToList();
//             int GetValueOrDefault(PulseStates key) => counter.FirstOrDefault(x => x.Key == key).Value;

//             Heatmap heatmap = new()
//             {
//                 Sqid = results.Sqid,
//                 Day = pulses.Key,
//                 Unknown = GetValueOrDefault(PulseStates.Unknown),
//                 Healthy = GetValueOrDefault(PulseStates.Healthy),
//                 Degraded = GetValueOrDefault(PulseStates.Degraded),
//                 Unhealthy = GetValueOrDefault(PulseStates.Unhealthy),
//                 TimedOut = GetValueOrDefault(PulseStates.TimedOut),
//             };

//             maps.Add(heatmap);
//         }

//         await context.Heatmaps.BulkUpsertAsync(maps, default);
//     }
// }

app.Run();
