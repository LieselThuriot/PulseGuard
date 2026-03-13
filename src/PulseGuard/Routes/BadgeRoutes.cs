using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class BadgeRoutes
{
    private const string UnknownColor = "2196F3";

    extension(IEndpointRouteBuilder builder)
    {
        public void MapBadges()
        {
            var group = builder.MapGroup("/1.0/badges").WithTags("Badges");

            group.MapGet("{id}", async (string id, PulseContext context, IHttpClientFactory clientFactory, HttpContext httpContext, CancellationToken token) =>
            {

                UniqueIdentifier? identifier = await context.Settings.FindUniqueIdentifierAsync(id, token);

                if (identifier is null)
                {
                    return UnknownBadge();
                }

                PulseStates state = await context.RecentPulses.Where(x => x.Sqid == id)
                                                 .SelectFields(x => new { x.State })
                                                 .Take(1)
                                                 .Select(x => x.State)
                                                 .FirstOrDefaultAsync(token);

                string name = identifier.GetFullName()
                                        .Replace("_", "__")
                                        .Replace("-", "--")
                                        .Replace(" ", "_");

                string url = $"{name}-{state}-{state switch
                {
                    PulseStates.Healthy => "04AA6D",
                    PulseStates.Degraded => "FF9800",
                    PulseStates.Unhealthy => "E91E63",
                    PulseStates.TimedOut => "FF0057",
                    _ => UnknownColor
                }}?style=flat-square";

                return Badge(url);

                HttpResponseMessageResult UnknownBadge()
                {
                    return Badge("Pulse-Unknown-" + UnknownColor);
                }

                HttpResponseMessageResult Badge(string url)
                {
                    HttpRequestMessage request = new(HttpMethod.Get, url);

                    request.Headers.UserAgent.TryParseAdd(httpContext.Request.Headers.UserAgent);
                    request.Headers.Accept.TryParseAdd(httpContext.Request.Headers.Accept);
                    request.Headers.AcceptEncoding.TryParseAdd(httpContext.Request.Headers.AcceptEncoding);
                    request.Headers.AcceptLanguage.TryParseAdd(httpContext.Request.Headers.AcceptLanguage);

                    return clientFactory.CreateClient("Badges").SendAsync(request, token);
                }
            });
        }
    }
}