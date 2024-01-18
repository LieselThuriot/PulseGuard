using Microsoft.AspNetCore.Mvc;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Data;
using System.Net.Mime;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class PulseRoutes
{
    private const int DefaultMinutes = 720;

    public static void MapPulses(this WebApplication app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/1.0/pulses");

        group.MapGet("", (PulseContext context, [FromQuery] uint? minutes = null, [FromQuery(Name = "f")] string? groupFilter = null) =>
        {
            DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-(minutes ?? DefaultMinutes));
            var query = context.Pulses.Where(x => x.Timestamp > offset);

            if (!string.IsNullOrWhiteSpace(groupFilter))
            {
                query = query.Where(x => x.Group == groupFilter);
            }

            return GetPulses(query);
        });

        group.MapGet("group/{group}", async (string group, PulseContext context, CancellationToken token, [FromQuery] uint? minutes = null) =>
        {
            List<string> relevantSqids = await GetRelevantSqidsForGroup(group, context, token);

            DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-(minutes ?? DefaultMinutes));
            return GetPulses(context.Pulses.ExistsIn(x => x.Sqid, relevantSqids).Where(x => x.Timestamp > offset));
        });

        group.MapGet("group/{group}/states", async (string group, PulseContext context, CancellationToken token, [FromQuery] int? days = null) =>
        {
            List<string> relevantSqids = await GetRelevantSqidsForGroup(group, context, token);

            var offset = DateTimeOffset.UtcNow.AddDays(-(days ?? 14));
            var groups = await context.Pulses.ExistsIn(x => x.Sqid, relevantSqids)
                                      .Where(x => x.CreationTimestamp > offset)
                                      .ToLookupAsync(x => x.Sqid, token);

            if (groups.Count is 0)
            {
                return Results.NotFound();
            }

            var entries = groups.Select(g => new PulseOverviewStateGroupItem(g.Key, g.First().Name, g.Select(x => new PulseStateItem(x.State, x.CreationTimestamp, x.Timestamp)).ToAsyncEnumerable()));
            return Results.Ok(new PulseOverviewStateGroup(group, entries.ToAsyncEnumerable()));
        });

        group.MapGet("application/{id}", async (string id, PulseContext context, CancellationToken token, [FromQuery] string? continuationToken = null, [FromQuery] int pageSize = 10) =>
        {
            var query = context.Pulses.Where(x => x.Sqid == id);

            if (!string.IsNullOrEmpty(continuationToken))
            {
                long creationTimeSeconds = Pulse.ConvertToUnixTimeSeconds(continuationToken);
                var creationTimestamp = DateTimeOffset.FromUnixTimeSeconds(creationTimeSeconds);
                query = query.Where(x => x.CreationTimestamp < creationTimestamp);
            }

            List<Pulse> items = await query.Take(pageSize).ToListAsync(token);

            if (items.Count is 0)
            {
                return Results.NotFound();
            }

            var entries = items.Select(x => new PulseDetailItem(x.State, x.Message, x.CreationTimestamp, x.Timestamp, x.Error));

            Pulse pulse = items[^1];

            continuationToken = items.Count < pageSize
                                     ? null
                                     : pulse.ContinuationToken;

            return Results.Ok(new PulseDetailGroupItem(pulse.Sqid, pulse.Name, continuationToken, entries.ToAsyncEnumerable()));
        });

        group.MapGet("application/{id}/states", async (string id, PulseContext context, CancellationToken token, [FromQuery] int? days = null) =>
        {
            var offset = DateTimeOffset.UtcNow.AddDays(-(days ?? 14));

            List<Pulse> items = await context.Pulses.Where(x => x.Sqid == id).Where(x => x.CreationTimestamp > offset).ToListAsync(token);

            if (items.Count is 0)
            {
                return Results.NotFound();
            }

            var entries = items.Select(x => new PulseStateItem(x.State, x.CreationTimestamp, x.Timestamp));

            Pulse pulse = items[^1];

            return Results.Ok(new PulseStateGroupItem(pulse.Sqid, pulse.Name, entries.ToAsyncEnumerable()));
        });

        group.MapGet("application/{id}/state", async (string id, PulseContext context, CancellationToken token) =>
        {
            Pulse? pulse = await context.Pulses.Where(x => x.Sqid == id)
                                               .SelectFields(x => new { x.State, x.CreationTimestamp })
                                               .FirstOrDefaultAsync(token);

            PulseStates state = pulse?.State ?? PulseStates.Unknown;

            int statusCode = state switch
            {
                PulseStates.Healthy => StatusCodes.Status200OK,
                PulseStates.Degraded => 218,
                PulseStates.Unknown => StatusCodes.Status404NotFound,
                _ => StatusCodes.Status503ServiceUnavailable
            };

            return TypedResults.Text(state.Stringify(), contentType: MediaTypeNames.Text.Plain, statusCode: statusCode);
        });
    }

    private static ValueTask<List<string>> GetRelevantSqidsForGroup(string group, PulseContext context, CancellationToken token)
    {
        return context.Configurations.Where(x => x.Group == group)
                                     .SelectFields(x => x.Sqid)
                                     .Select(x => x.Sqid)
                                     .Distinct()
                                     .Where(x => !string.IsNullOrWhiteSpace(x))
                                     .ToListAsync(token);
    }

    private static IAsyncEnumerable<PulseOverviewGroup> GetPulses(IFilteredTableQueryable<Pulse> query)
    {
        return query.SelectFields(x => new { x.Sqid, x.Group, x.Name, x.Message, x.State, x.CreationTimestamp, x.Timestamp })
                    .GroupBy(x => x.Group ?? "")
                    .Select(group =>
                        new PulseOverviewGroup(group.Key, group.GroupBy(x => new { x.Sqid, x.Name })
                                                               .Select(pulses =>
                                                               {
                                                                   var entries = pulses.Select(x => new PulseOverviewItem(x.State, x.Message, x.CreationTimestamp, x.Timestamp));
                                                                   return new PulseOverviewGroupItem(pulses.Key.Sqid, pulses.Key.Name, entries);
                                                               }))
                    );
    }
}