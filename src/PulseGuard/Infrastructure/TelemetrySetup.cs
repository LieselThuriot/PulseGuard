using Microsoft.ApplicationInsights.Channel;
using Microsoft.ApplicationInsights.Extensibility;
using System.Security.Claims;

namespace PulseGuard.Infrastructure;

internal static class TelemetrySetup
{
    public static void ConfigurePulseTelemetry(this IServiceCollection services, ConfigurationManager configuration, bool authorized)
    {
        string? connectionstring = configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
        bool track = bool.TryParse(configuration["APPLICATIONINSIGHTS_DEPENDENCY_TRACKING"], out bool parsedTrack) && parsedTrack;

        services.AddApplicationInsightsTelemetry(x =>
        {
            x.ConnectionString = connectionstring;
            x.EnableDependencyTrackingTelemetryModule = track;
        });

        if (authorized)
        {
            bool disableUserTracking = bool.TryParse(configuration["APPLICATIONINSIGHTS_DISABLE_USER_TRACKING"], out bool parsedUserTrack) && parsedUserTrack;

            if (!disableUserTracking)
            {
                services.AddHttpContextAccessor();
                services.AddSingleton<ITelemetryInitializer, UserTelemetryInitializer>();
            }
        }
    }

    internal sealed class UserTelemetryInitializer(IHttpContextAccessor httpContextAccessor) : ITelemetryInitializer
    {
        private readonly IHttpContextAccessor _httpContextAccessor = httpContextAccessor;

        public void Initialize(ITelemetry telemetry)
        {
            string? userId = _httpContextAccessor?.HttpContext?.User?.FindFirstValue("applicationuserid");

            if (userId is null)
            {
                return;
            }

            telemetry.Context.User.Id = userId;
            telemetry.Context.User.AuthenticatedUserId = userId;
        }
    }
}
