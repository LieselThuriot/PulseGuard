using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class BadgeRoutes
{
    private const string UnknownColor = "2196F3";

    public static void MapBadges(this WebApplication app)
    {
        var group = app.MapGroup("/1.0/badges").WithTags("Badges");

        group.MapGet("{id}", async (string id, PulseContext context, IHttpClientFactory clientFactory, HttpContext httpContext, CancellationToken token) =>
        {
            Pulse? pulse = await context.Pulses.Where(x => x.Sqid == id)
                                               .SelectFields(x => new { x.Group, x.Name, x.State, x.CreationTimestamp })
                                               .FirstOrDefaultAsync(token);

            if (pulse is null)
            {
                return Badge("Pulse > Unknown > " + UnknownColor);
            }

            string name = pulse.GetFullName()
                               .Replace("_", "__")
                               .Replace("-", "--")
                               .Replace(" ", "_");

            string url = $"{name}-{pulse.State}-{pulse.State switch
            {
                PulseStates.Healthy => "04AA6D",
                PulseStates.Degraded => "FF9800",
                PulseStates.Unhealthy => "E91E63",
                _ => UnknownColor
            }}?style=flat-square";

            return Badge(url);

            IResult Badge(string url)
            {
                HttpRequestMessage request = new(HttpMethod.Get, url);

                request.Headers.UserAgent.TryParseAdd(httpContext.Request.Headers.UserAgent);
                request.Headers.AcceptEncoding.TryParseAdd(httpContext.Request.Headers.AcceptEncoding);
                request.Headers.AcceptLanguage.TryParseAdd(httpContext.Request.Headers.AcceptLanguage);

                return new HttpResponseMessageResult(clientFactory.CreateClient("Badges").SendAsync(request, token));
            }
        });
    }
}