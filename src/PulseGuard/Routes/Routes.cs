using Scalar.AspNetCore;
using System.Buffers;
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
            app.UseAuthentication();
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
            return next();
        });

        routes.MapPulses();
        routes.MapProtoPulses();

        routes.MapEvents();

        routes.MapBadges();
        routes.MapHealth();

        routes.MapAdministration(authorized);

        MapViews(app, authorized, routes);
    }

    private static void MapViews(WebApplication app, bool authorized, IEndpointRouteBuilder routes)
    {
        var noRedirectPaths = SearchValues.Create(["/api/", "/assets/", "/signin-oidc", "/signout-oidc"], StringComparison.OrdinalIgnoreCase);
        app.Use((context, next) =>
        {
            if (context.Request.Path.HasValue)
            {
                string path = context.Request.Path.Value;
                if (path.EndsWith('/') || path.AsSpan().ContainsAny(noRedirectPaths))
                {
                    return next();
                }
            }

            context.Response.Redirect(context.Request.PathBase + context.Request.Path + "/" + context.Request.QueryString);
            return Task.CompletedTask;
        });

        var adminRoutesSearch = SearchValues.Create(["/admin"], StringComparison.OrdinalIgnoreCase);
        Views.V2.Routes.MapViews(routes.MapGroup("").WithTags("Views V2").ExcludeFromDescription(), (RouteHandlerBuilder builder, string route) =>
        {
            if (route.AsSpan().ContainsAny(adminRoutesSearch))
            {
                builder.RequireAuthorization(Infrastructure.AuthSetup.AdministratorPolicy);
            }
        },
        route => !route.AsSpan().ContainsAny(adminRoutesSearch) || authorized);

        Views.Routes.MapViews(routes.MapGroup("v1").WithTags("Views V1").ExcludeFromDescription());
    }
}
