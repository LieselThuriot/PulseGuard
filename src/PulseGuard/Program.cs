using PulseGuard.Infrastructure;
using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Routes;
using PulseGuard.Views;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

string storeConnectionString = builder.Configuration.GetConnectionString("PulseStore") ?? throw new NullReferenceException("PulseStore");
builder.Services.Configure<PulseOptions>(builder.Configuration.GetSection("pulse"))
                .PostConfigure<PulseOptions>(options => options.Store = storeConnectionString);

builder.Services.AddApplicationInsightsTelemetry(x => x.ConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]);
builder.Services.ConfigureHttpJsonOptions(x =>
{
    x.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    x.SerializerOptions.TypeInfoResolverChain.Insert(0, PulseSerializerContext.Default);
    x.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.ConfigurePulseHttpClients();
builder.Services.AddPulseContext(storeConnectionString, x => x.CreateTableIfNotExists = false);
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
}

app.UseHttpsRedirection();

//app.UseAuthorization();

app.Use((context, next) =>
{
    if (string.IsNullOrEmpty(context.Request.Path.Value))
    {
        context.Response.Redirect(context.Request.PathBase + context.Request.Path + "/");
        return Task.CompletedTask;
    }

    context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
    return next();
});

app.MapPulses();
app.MapBadges();
app.MapViews();
app.MapHealth();

app.Run();