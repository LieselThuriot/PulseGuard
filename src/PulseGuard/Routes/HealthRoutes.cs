using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Diagnostics;
using System.Net;
using System.Net.Mime;
using System.Text;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class HealthRoutes
{
    private static DateTimeOffset GetOffset(int interval) => DateTimeOffset.UtcNow.AddMinutes(-interval * 2.5);
    private static HttpStatusCode MapToStatusCode(PulseStates state) => state switch
    {
        PulseStates.Healthy or PulseStates.Degraded => HttpStatusCode.OK,
        PulseStates.TimedOut => HttpStatusCode.GatewayTimeout,
        PulseStates.Unknown => HttpStatusCode.NotFound,
        _ => HttpStatusCode.ServiceUnavailable
    };

    extension(IEndpointRouteBuilder builder)
    {
        public void MapHealth()
        {
            builder.MapGet("/version", () => TypedResults.Ok(new AppVersion(AppInfo.Version)))
                   .WithTags("Health")
                   .AllowAnonymous();

            var healthGroup = builder.MapGroup("/health").WithTags("Health");

            healthGroup.MapGet("", async (IMemoryCache cache, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                PulseStates state = await cache.GetOrCreateAsync("health", async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(10);
                    PulseStates state = PulseStates.Unhealthy;

                    try
                    {
                        using var cts = CancellationTokenSource.CreateLinkedTokenSource(token);
                        cts.CancelAfter(5000);

                        var sw = Stopwatch.StartNew();
                        _ = await context.Configurations.FirstOrDefaultAsync(cts.Token);

                        state = sw.ElapsedMilliseconds > 1000
                                  ? PulseStates.Degraded
                                  : PulseStates.Healthy;
                    }
                    catch (Exception ex)
                    {
                        logger.FailedHealthChecks(ex);
                        state = PulseStates.TimedOut;
                    }

                    return state;
                });

                HttpStatusCode statusCode = MapToStatusCode(state);
                return TypedResults.Text(state.Stringify(), MediaTypeNames.Text.Plain, Encoding.Default, (int)statusCode);
            })
            .AllowAnonymous();

            healthGroup.MapGet("applications", async (IOptions<PulseOptions> options, PulseContext context, CancellationToken token) =>
            {
                var uniqueIdentifiers = await context.Settings.WhereUniqueIdentifier()
                                                     .SelectFields(x => new { x.Id, x.Group, x.Name })
                                                     .ToDictionaryAsync(x => x.Id, cancellationToken: token);

                DateTimeOffset offset = GetOffset(options.Value.Interval);
                return await context.RecentPulses.Where(x => x.LastUpdatedTimestamp > offset)
                                    .SelectFields(x => new { x.Sqid, x.State, x.LastUpdatedTimestamp })
                                    .GroupBy(x => uniqueIdentifiers[x.Sqid].GetFullName())
                                    .Select(x => x.OrderByDescending(y => y.LastUpdatedTimestamp).Select(y => (Name: x.Key, y.State)).First())
                                    .OrderBy(x => x.Name)
                                    .ToDictionaryAsync(cancellationToken: token);
            });

            healthGroup.MapGet("query", async ([FromQuery(Name = "id")] string[] ids, IOptions<PulseOptions> options, PulseContext context, CancellationToken token) =>
            {
                if (ids is not { Length: > 0 })
                {
                    return Results.BadRequest();
                }

                DateTimeOffset offset = GetOffset(options.Value.Interval);
                var state = await context.RecentPulses
                                         .ExistsIn(x => x.Sqid, ids)
                                         .Where(x => x.LastUpdatedTimestamp > offset)
                                         .SelectFields(x => new { x.Sqid, x.State, x.LastUpdatedTimestamp })
                                         .GroupBy(x => x.Sqid)
                                         .Select(x => x.OrderByDescending(y => y.LastUpdatedTimestamp).Select(y => y.State).First())
                                         .AggregateAsync(PulseStates.Unknown, (current, state) => current < state ? state : current, cancellationToken: token);

                HttpStatusCode code = MapToStatusCode(state);
                return Results.Text(state.Stringify(), MediaTypeNames.Text.Plain, Encoding.Default, (int)code);
            });
        }
    }
}