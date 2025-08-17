using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Data;
using System.Net.Mime;
using TableStorage;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class PulseRoutes
{
    public static void MapPulses(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/1.0/pulses").WithTags("Pulses");

        group.MapGet("", async (PulseContext context, CancellationToken token, [FromQuery] uint? minutes = null, [FromQuery(Name = "f")] string? groupFilter = null) =>
        {
            var (query, identifiers) = BuildQuery(context, minutes);

            if (!string.IsNullOrWhiteSpace(groupFilter))
            {
                query = query.Where(x => x.Group == groupFilter);
                identifiers = identifiers.Where(x => x.Group == groupFilter);
            }

            var lookup = await identifiers.ToDictionaryAsync(x => x.Id, cancellationToken: token);
            return await GetPulses(query, lookup, token);
        });

        group.MapGet("group/{group}", async (string group, PulseContext context, CancellationToken token, [FromQuery] uint? minutes = null) =>
        {
            var (query, identifiers) = BuildQuery(context, minutes);

            var info = await identifiers.Where(x => x.Group == group).ToListAsync(token);
            query = query.ExistsIn(x => x.Sqid, [.. info.Select(x => x.Id)]);

            var lookup = info.ToDictionary(x => x.Id);
            return await GetPulses(query, lookup, token);
        });

        group.MapGet("group/{group}/states", async Task<Results<Ok<PulseOverviewStateGroup>, NotFound>> (string group, PulseContext context, CancellationToken token, [FromQuery] int? days = null) =>
        {
            List<string> relevantSqids = await GetRelevantSqidsForGroup(group, context, token);

            var offset = DateTimeOffset.UtcNow.AddDays(-(days ?? 14));
            var groups = await context.Pulses.ExistsIn(x => x.Sqid, relevantSqids)
                                      .Where(x => x.CreationTimestamp > offset)
                                      .ToLookupAsync(x => x.Sqid, cancellationToken: token);

            if (groups.Count is 0)
            {
                return TypedResults.NotFound();
            }

            PulseOverviewStateGroup result = new(group,
                                                 groups.Select(g => new PulseOverviewStateGroupItem(g.Key,
                                                                                                    g.First().Name,
                                                                                                    g.Select(x => new PulseStateItem(x.State,
                                                                                                                                     x.CreationTimestamp,
                                                                                                                                     x.LastUpdatedTimestamp))))
                                           );

            return TypedResults.Ok(result);
        });

        group.MapGet("application/{id}", async Task<Results<Ok<PulseDetailGroupItem>, NotFound>> (string id, PulseContext context, CancellationToken token, [FromQuery] string? continuationToken = null, [FromQuery] int pageSize = 10) =>
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
                return TypedResults.NotFound();
            }

            var entries = items.Select(x => new PulseDetailItem(x.State, x.Message, x.CreationTimestamp, x.LastUpdatedTimestamp, x.Error));

            Pulse pulse = items[^1];

            continuationToken = items.Count < pageSize
                                     ? null
                                     : pulse.ContinuationToken;

            PulseDetailGroupItem result = new(pulse.Sqid, pulse.Name, continuationToken, entries);
            return TypedResults.Ok(result);
        });

        group.MapGet("application/{id}/states", async Task<Results<Ok<PulseStateGroupItem>, NotFound>> (string id, PulseContext context, CancellationToken token, [FromQuery] int? days = null) =>
        {
            var offset = DateTimeOffset.UtcNow.AddDays(-(days ?? 14));

            List<Pulse> items = await context.Pulses.Where(x => x.Sqid == id).Where(x => x.CreationTimestamp > offset).ToListAsync(token);

            if (items.Count is 0)
            {
                return TypedResults.NotFound();
            }

            var entries = items.Select(x => new PulseStateItem(x.State, x.CreationTimestamp, x.LastUpdatedTimestamp));

            Pulse pulse = items[^1];

            PulseStateGroupItem result = new(pulse.Sqid, pulse.Name, entries);
            return TypedResults.Ok(result);
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

    private static ISelectedTableQueryable<Pulse> SelectPulseOverviewFields(TableSet<Pulse> pulses)
    {
        return pulses.SelectFields(x => new { x.Sqid, x.Group, x.Name, x.Message, x.State, x.CreationTimestamp, x.LastUpdatedTimestamp });
    }

    private static (ISelectedTableQueryable<Pulse> query, IAsyncEnumerable<UniqueIdentifier> identifiers) BuildQuery(PulseContext context, uint? minutes)
    {
        uint minuteOffset = minutes ?? PulseContext.RecentMinutes;
        DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-minuteOffset);

        ISelectedTableQueryable<Pulse> query = SelectPulseOverviewFields(minuteOffset > PulseContext.RecentMinutes ? context.Pulses : context.RecentPulses);

        if (minuteOffset is not PulseContext.RecentMinutes)
        {
            query = query.Where(x => x.LastUpdatedTimestamp > offset);
        }

        IAsyncEnumerable<UniqueIdentifier> identifiers = context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration);
        return (query, identifiers);
    }

    private static ValueTask<List<string>> GetRelevantSqidsForGroup(string group, PulseContext context, CancellationToken token)
    {
        return context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration && x.Group == group)
                                        .SelectFields(x => x.Id)
                                        .Select(x => x.Id)
                                        .ToListAsync(token);
    }

    private static ValueTask<List<PulseOverviewGroup>> GetPulses(IAsyncEnumerable<Pulse> query, IReadOnlyDictionary<string, UniqueIdentifier> identifiers, CancellationToken token)
    {
        return query.Select(x => (info: identifiers[x.Sqid], item: x))
                    .GroupBy(x => x.info.Group ?? "")
                    .Select(group =>
                        new PulseOverviewGroup(group.Key, group.GroupBy(x => new { x.info.Id, x.info.Name })
                                                               .Select(pulses =>
                                                               {
                                                                   var entries = pulses.Select(x => new PulseOverviewItem(x.item.State, x.item.Message, x.item.CreationTimestamp, x.item.LastUpdatedTimestamp));
                                                                   return new PulseOverviewGroupItem(pulses.Key.Id, pulses.Key.Name, entries);
                                                               }))
                    ).ToListAsync(token);
    }
}