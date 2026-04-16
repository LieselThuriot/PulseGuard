using PulseGuard.Infrastructure;
using Scalar.AspNetCore;
using System.Net.Mime;
using System.Text;
using Yarp.ReverseProxy.Forwarder;

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

            if (!(bool.TryParse(app.Configuration["APPLICATIONINSIGHTS_DISABLE_USER_TRACKING"], out bool parsedUserTrack) && parsedUserTrack))
            {
                app.UsePulseTelemetry();
            }

            routes.MapGet("access-denied", () => Results.Content("You do not have permission to access this resource.", MediaTypeNames.Text.Plain, Encoding.UTF8, 403))
                  .WithTags("Authorization")
                  .ExcludeFromDescription()
                  .AllowAnonymous();

            routes = routes.MapGroup("").RequireAuthorization();
        }

        app.Use((context, next) =>
        {
            context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            context.Response.Headers.ContentSecurityPolicy =
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; " +
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
                "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; " +
                "img-src 'self' data:; " +
                "connect-src 'self' https://cdn.jsdelivr.net; " +
                "frame-ancestors 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self'";
            return next();
        });
        
        if (!app.Environment.IsDevelopment())
        {
            app.UseDefaultFiles();
            routes.MapStaticAssets();
        }

        //if (app.Environment.IsDevelopment())
        {
            routes.MapOpenApi();
            routes.MapScalarApiReference();
        }

        routes.MapPulses();
        routes.MapProtoPulses();

        routes.MapEvents();

        routes.MapBadges();
        routes.MapHealth();

        routes.MapAdministration(authorized);

        if (app.Environment.IsDevelopment())
        {
            var forwarder = app.Services.GetRequiredService<IHttpForwarder>();
            var httpClient = new HttpMessageInvoker(new SocketsHttpHandler());
            string spaDevServerUrl = app.Configuration["SpaDevServerUrl"] ?? "http://localhost:4200";

            routes.MapFallback("/{**catch-all}", async context =>
            {
                await forwarder.SendAsync(context, spaDevServerUrl, httpClient,
                    new ForwarderRequestConfig(), HttpTransformer.Default);
            });
        }
        else
        {
            routes.MapFallbackToFile("/index.html");
        }
    }
}