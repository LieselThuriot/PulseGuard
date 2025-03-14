using PulseGuard.Entities;
using PulseGuard.Entities.Serializers;
using PulseGuard.Infrastructure;
using PulseGuard.Models;
using PulseGuard.Routes;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(o => o.AddPolicy("GetorPost", x => x.AllowAnyOrigin().WithMethods("GET", "POST").AllowAnyHeader()));

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
    x.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

bool autoCreate = builder.Environment.IsDevelopment();

builder.Services.ConfigurePulseHttpClients();
builder.Services.AddPulseContext(storeConnectionString,
x => x.CreateTableIfNotExists = autoCreate,
x =>
{
    x.CreateTableIfNotExists = autoCreate;
    x.Serializer = new PulseBlobSerializer();
});
builder.Services.ConfigurePulseServices();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

string? pathBase = app.Configuration["PathBase"];
if (!string.IsNullOrEmpty(pathBase))
{
    app.UsePathBase(pathBase);
    app.UseRouting();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("GetorPost");
}

app.UseHttpsRedirection();

//app.UseAuthorization();

app.MapRoutes();

app.Run();