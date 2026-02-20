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

app.Run();