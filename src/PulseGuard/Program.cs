using PulseGuard.Entities;
using PulseGuard.Entities.Serializers;
using PulseGuard.Infrastructure;
using PulseGuard.Models;
using PulseGuard.Routes;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

bool autoCreate = !builder.Environment.IsDevelopment();

string storeConnectionString = builder.Configuration.GetConnectionString("PulseStore") ?? throw new NullReferenceException("PulseStore");
builder.Services.Configure<PulseOptions>(builder.Configuration.GetSection("pulse"))
                .PostConfigure<PulseOptions>(options => options.Store = storeConnectionString);

bool authorized = builder.Services.ConfigureAuthentication(builder.Configuration);

builder.Services.ConfigurePulseTelemetry(builder.Configuration, authorized);

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

app.MapRoutes(authorized);

app.Run();