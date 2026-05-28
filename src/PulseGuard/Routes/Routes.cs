using Microsoft.Net.Http.Headers;
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
            context.Response.Headers.ContentSecurityPolicy =
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "font-src 'self'; " +
                "img-src 'self' data:; " +
                "connect-src 'self' ws: wss:; " +
                "object-src 'none'; " +
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

        var apiRoutes = routes.MapGroup("")
                              .AddEndpointFilter(async (context, next) =>
                              {
                                  object? result = await next(context);
                                  HttpResponse response = context.HttpContext.Response;

                                  if (!response.HasStarted &&
                                      !response.Headers.ContainsKey(HeaderNames.CacheControl))
                                  {
                                      response.Headers[HeaderNames.CacheControl] = "no-cache, no-store, must-revalidate";
                                      response.Headers[HeaderNames.Pragma] = "no-cache";
                                      response.Headers[HeaderNames.Expires] = "0";
                                  }

                                  return result;
                              });

        //if (app.Environment.IsDevelopment())
        {
            apiRoutes.MapOpenApi();
            apiRoutes.MapScalarApiReference();
        }

        apiRoutes.MapPulses();
        apiRoutes.MapProtoPulses();
        apiRoutes.MapEvents();

        apiRoutes.MapBadges();
        apiRoutes.MapHealth();

        apiRoutes.MapAdministration(authorized);

        app.MapViews(routes);
    }

    private static void MapViews(this WebApplication app, IEndpointRouteBuilder routes)
    {
        if (app.Environment.IsDevelopment())
        {
            var forwarder = app.Services.GetRequiredService<IHttpForwarder>();
            HttpMessageInvoker httpClient = new(new SocketsHttpHandler());
            string spaDevServerUrl = app.Configuration["SpaDevServerUrl"] ?? "http://localhost:4200";

            routes.MapFallback("/{**catch-all}", async context => await forwarder.SendAsync(context, spaDevServerUrl, httpClient, new ForwarderRequestConfig(), HttpTransformer.Default));
        }
        else
        {
            routes.MapFallbackToFile("/index.html");
        }
    }
}