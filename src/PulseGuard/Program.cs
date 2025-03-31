using PulseGuard.Entities;
using PulseGuard.Entities.Serializers;
using PulseGuard.Infrastructure;
using PulseGuard.Models;
using PulseGuard.Routes;
using Scalar.AspNetCore;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

bool autoCreate = !builder.Environment.IsDevelopment();

string storeConnectionString = builder.Configuration.GetConnectionString("PulseStore") ?? throw new NullReferenceException("PulseStore");
builder.Services.Configure<PulseOptions>(builder.Configuration.GetSection("pulse"))
                .PostConfigure<PulseOptions>(options => options.Store = storeConnectionString);

builder.Services.AddApplicationInsightsTelemetry(x =>
{
    x.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
    x.EnableDependencyTrackingTelemetryModule = bool.TryParse(builder.Configuration["APPLICATIONINSIGHTS_DEPENDENCY_TRACKING"], out bool track) && track;
});

builder.Services.ConfigureHttpJsonOptions(x =>
{
    x.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    x.SerializerOptions.TypeInfoResolverChain.Insert(0, PulseSerializerContext.Default);
});

builder.Services.ConfigurePulseHttpClients();
builder.Services.AddPulseContext(storeConnectionString,
x => x.CreateTableIfNotExists = autoCreate,
x =>
{
    x.CreateContainerIfNotExists = autoCreate;
    x.Serializer = new PulseBlobSerializer();
});
builder.Services.ConfigurePulseServices();

builder.Services.AddOpenApi();

var app = builder.Build();

string? pathBase = app.Configuration["PathBase"];
if (!string.IsNullOrEmpty(pathBase))
{
    app.UsePathBase(pathBase);
    app.UseRouting();
}

//if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

//app.UseAuthorization();

app.MapRoutes();

app.Run();