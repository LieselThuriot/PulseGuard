using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Diagnostics;
using System.Net.Mime;
using System.Text;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class HealthRoutes
{
    extension(IEndpointRouteBuilder builder)
    {
        public void MapHealth()
        {
            var healthGroup = builder.MapGroup("/health").WithTags("Health");

            healthGroup.MapGet("", async (IMemoryCache cache, PulseContext context, ILogger<Program> logger, CancellationToken token) =>
            {
                (PulseStates state, int statusCode) = await cache.GetOrCreateAsync("health", async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(10);
                    PulseStates state = PulseStates.Unhealthy;
                    int statusCode = 200;

                    try
                    {
                        using var cts = CancellationTokenSource.CreateLinkedTokenSource(token);
                        cts.CancelAfter(5000);

                        var sw = Stopwatch.StartNew();
                        _ = await context.Configurations.FirstOrDefaultAsync(cts.Token);

                        state = sw.ElapsedMilliseconds > 1000
                                  ? PulseStates.Degraded
                                  : PulseStates.Healthy;

                        statusCode = 200;
                    }
                    catch (Exception ex)
                    {
                        logger.FailedHealthChecks(ex);
                        state = PulseStates.Unhealthy;
                        statusCode = 503;
                    }

                    return (state, statusCode);
                });

                return TypedResults.Text(state.Stringify(), MediaTypeNames.Text.Plain, Encoding.Default, statusCode);
            })
            .AllowAnonymous();

            healthGroup.MapGet("applications", async (IOptions<PulseOptions> options, PulseContext context, CancellationToken token) =>
            {
                var uniqueIdentifiers = await context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration)
                                                     .SelectFields(x => new { x.Id, x.Group, x.Name })
                                                     .ToDictionaryAsync(x => x.Id, cancellationToken: token);

                DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-options.Value.Interval * 2.5);
                return await context.RecentPulses.Where(x => x.LastUpdatedTimestamp > offset)
                                    .SelectFields(x => new { x.Sqid, x.State, x.LastUpdatedTimestamp })
                                    .GroupBy(x => uniqueIdentifiers[x.Sqid].GetFullName())
                                    .Select(x => x.OrderByDescending(y => y.LastUpdatedTimestamp).Select(y => (Name: x.Key, y.State)).First())
                                    .OrderBy(x => x.Name)
                                    .ToDictionaryAsync(cancellationToken: token);
            });
        }
    }
}