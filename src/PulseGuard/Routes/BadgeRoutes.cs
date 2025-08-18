using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class BadgeRoutes
{
    private const string UnknownColor = "2196F3";

    public static void MapBadges(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/1.0/badges").WithTags("Badges");

        group.MapGet("{id}", async (string id, PulseContext context, IHttpClientFactory clientFactory, HttpContext httpContext, CancellationToken token) =>
        {
            UniqueIdentifier? identifier = await context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration && x.Id == id)
                                                        .SelectFields(x => new { x.Group, x.Name })
                                                        .FirstOrDefaultAsync(token);

            if (identifier is null)
            {
                return UnknownBadge();
            }

            Pulse? pulse = await context.Pulses.Where(x => x.Sqid == id)
                                               .SelectFields(x => new { x.State, x.CreationTimestamp })
                                               .FirstOrDefaultAsync(token);

            if (pulse is null)
            {
                return UnknownBadge();
            }

            string name = identifier.GetFullName()
                                    .Replace("_", "__")
                                    .Replace("-", "--")
                                    .Replace(" ", "_");

            string url = $"{name}-{pulse.State}-{pulse.State switch
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
                return Badge("Pulse > Unknown > " + UnknownColor);
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