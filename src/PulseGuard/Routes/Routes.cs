namespace PulseGuard.Routes;

public static class Routes
{
    public static void MapRoutes(this WebApplication app)
    {
        app.Use((context, next) =>
        {
            context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            return context.Request.Path.Value switch
            {
                null or "" or "/v-next" => DoRedirect(),
                _ => next()
            };

            Task DoRedirect()
            {
                context.Response.Redirect(context.Request.PathBase + context.Request.Path + "/");
                return Task.CompletedTask;
            }
        });

        app.MapPulses();
        app.MapBadges();

        Views.Routes.MapViews(app.MapGroup("").WithTags("Views").ExcludeFromDescription());
        Views.V2.Routes.MapViews(app.MapGroup("v-next").WithTags("V-Next").ExcludeFromDescription());

        app.MapHealth();
    }
}
