using Microsoft.AspNetCore.HttpOverrides;
using PulseGuard.Entities;
using PulseGuard.Entities.Serializers;
using PulseGuard.Infrastructure;
using PulseGuard.Models;
using PulseGuard.Routes;
using System.Text.Json.Serialization;
using TableStorage;

var builder = WebApplication.CreateBuilder(args);

string storeConnectionString = builder.Configuration.GetConnectionString("PulseStore") ?? throw new NullReferenceException("PulseStore");
builder.Services.Configure<PulseOptions>(builder.Configuration.GetSection("pulse"))
                .PostConfigure<PulseOptions>(options => options.Store = storeConnectionString);

bool isDevelopment = builder.Environment.IsDevelopment();
builder.Services.AddPulseContext(storeConnectionString,
    x => x.CreateTableIfNotExists = isDevelopment,
    x =>
    {
        x.CreateContainerIfNotExists = isDevelopment;
        x.Serializer = new PulseBlobSerializer();
        x.EnableCompilationAtRuntime();
    }
);

bool authorized = builder.Services.ConfigureAuthentication(builder.Configuration);
builder.Services.ConfigurePulseTelemetry(builder.Configuration, authorized);

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
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();

if (!isDevelopment)
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
app.UseWebSockets();

app.Run();