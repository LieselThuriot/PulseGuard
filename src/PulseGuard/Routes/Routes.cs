using Scalar.AspNetCore;
using System.Net.Mime;
using System.Text;

namespace PulseGuard.Routes;

public static class Routes
{
    public static void MapRoutes(this WebApplication app, bool authorized)
    {
        IEndpointRouteBuilder routes = app;

        if (authorized)
        {
            app.UseAuthorization();

            routes.MapGet("AccessDenied", () => Results.Content("You do not have permission to access this resource.", MediaTypeNames.Text.Plain, Encoding.UTF8, 403))
                  .WithTags("Authorization")
                  .ExcludeFromDescription()
                  .AllowAnonymous();

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
                null or "" or "/v1" => DoRedirect(),
                _ => next()
            };

            Task DoRedirect()
            {
                context.Response.Redirect(context.Request.PathBase + context.Request.Path + "/");
                return Task.CompletedTask;
            }
        });

        routes.MapPulses();
        routes.MapProtoPulses();
        routes.MapBadges();

        Views.V2.Routes.MapViews(routes.MapGroup("").WithTags("Views V2").ExcludeFromDescription());
        Views.Routes.MapViews(routes.MapGroup("v1").WithTags("Views V1").ExcludeFromDescription());

        routes.MapHealth();
    }
}
