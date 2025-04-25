using Scalar.AspNetCore;

namespace PulseGuard.Routes;

public static class Routes
{
    public static void MapRoutes(this WebApplication app, bool authorized)
    {
        app.UseHttpsRedirection();

        IEndpointRouteBuilder routes = app;

        if (authorized)
        {
            app.UseAuthorization();
            routes = routes.MapGroup("").RequireAuthorization();
        }

        //if (app.Environment.IsDevelopment())
        {
            routes.MapOpenApi();
            routes.MapScalarApiReference();
        }

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

        routes.MapPulses();
        routes.MapBadges();

        Views.Routes.MapViews(routes.MapGroup("").WithTags("Views").ExcludeFromDescription());
        Views.V2.Routes.MapViews(routes.MapGroup("v-next").WithTags("V-Next").ExcludeFromDescription());

        app.MapHealth(authorized);
    }
}
