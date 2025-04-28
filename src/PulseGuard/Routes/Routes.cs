using Scalar.AspNetCore;
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

        routes.MapHealth();

        app.MapGet("/test/headers", (HttpRequest request) =>
        {
            StringBuilder builder = new();

            foreach (var (key, header) in request.Headers)
            {
                builder.AppendLine($"{key}: {header}");
            }

            return TypedResults.Text(builder.ToString());
        }).WithName("TestHeaders").WithTags("Test").ExcludeFromDescription();
    }
}
