using Azure.Monitor.OpenTelemetry.Exporter;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace PulseGuard.Infrastructure;

internal static class TelemetrySetup
{
    private const string DefaultServiceName = "pulseguard";

    public static void ConfigurePulseTelemetry(this IServiceCollection services, ConfigurationManager configuration)
    {
        bool useOtlp = !string.IsNullOrWhiteSpace(configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
        bool useAzureMonitor = !string.IsNullOrWhiteSpace(configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"]);

        if (!useOtlp && !useAzureMonitor)
        {
            return;
        }

        // Lets the Azure SDK (Tables, Blobs, Queues, Key Vault, Identity) emit its own spans; must run before any Azure client is created.
        AppContext.SetSwitch("Azure.Experimental.EnableActivitySource", true);

        string serviceInstanceId = configuration["WEBSITE_INSTANCE_ID"] is { Length: > 0 } instanceId ? instanceId : Environment.MachineName;

        OpenTelemetryBuilder telemetry = services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddAzureAppServiceDetector()
                .AddHostDetector()
                .AddService(serviceName: DefaultServiceName,
                            serviceVersion: AppInfo.Version.Split('+')[0],
                            autoGenerateServiceInstanceId: false,
                            serviceInstanceId: serviceInstanceId)
                // Applied last so OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES override the detectors,
                // e.g. the App Service detector reporting the slot name as deployment.environment.name.
                .AddEnvironmentVariableDetector())
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options => options.Filter = context => !IsHealthProbe(context.Request.Path))
                .AddHttpClientInstrumentation()
                .AddSource("Azure.*"))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddProcessInstrumentation()
                .AddMeter(PulseMetrics.MeterName))
            .WithLogging();

        if (useOtlp)
        {
            telemetry.UseOtlpExporter();
        }
        else
        {
            telemetry.UseAzureMonitorExporter();
        }
    }

    // Runs before UsePathBase, so the path may still include the path base.
    private static bool IsHealthProbe(PathString path)
    {
        string value = path.Value?.TrimEnd('/') ?? string.Empty;
        return value.EndsWith("/health", StringComparison.OrdinalIgnoreCase)
            || value.EndsWith("/warmup", StringComparison.OrdinalIgnoreCase);
    }
}
