using Microsoft.ApplicationInsights;
using System.Security.Principal;

namespace PulseGuard.Infrastructure;

internal static class TelemetrySetup
{
    public static void ConfigurePulseTelemetry(this IServiceCollection services, ConfigurationManager configuration)
    {
        string? connectionstring = configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
        bool track = bool.TryParse(configuration["APPLICATIONINSIGHTS_DEPENDENCY_TRACKING"], out bool parsedTrack) && parsedTrack;

        services.AddApplicationInsightsTelemetry(x =>
        {
            x.ConnectionString = connectionstring;
            x.EnableDependencyTrackingTelemetryModule = track;
        });
    }

    public static void UsePulseTelemetry(this WebApplication app)
    {
        app.UseMiddleware<UserIdMiddleware>();
    }

    private sealed class UserIdMiddleware(RequestDelegate next, TelemetryClient client)
    {
        private readonly RequestDelegate _next = next;
        private readonly TelemetryClient _client = client;

        public Task InvokeAsync(HttpContext context)
        {
            IIdentity? identity = context.User?.Identity;

            if (identity?.IsAuthenticated == true)
            {
                var user = _client.Context.User;

                user.AuthenticatedUserId = identity.Name;
                user.UserAgent = context.Request.Headers.UserAgent;
            }

            return _next(context);
        }
    }
}