using PulseGuard.Views;

namespace PulseGuard.Routes;

public static class Routes
{
    public static void MapRoutes(this WebApplication app)
    {
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
    }
}
