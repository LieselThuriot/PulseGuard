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
    extension(IEndpointRouteBuilder builder)
    {
        public void MapPulses()
        {
            RouteGroupBuilder group = builder.MapGroup("/api/1.0/pulses").WithTags("Pulses");

            group.MapGet("", async (PulseContext context, CancellationToken token, [FromQuery] uint? minutes = null) =>
            {
                var (query, identifiers) = BuildQuery(context, minutes);
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
                var relevantSqids = await GetRelevantSqidsForGroup(group, context, token);

                var offset = DateTimeOffset.UtcNow.AddDays(-(days ?? 14));
                var groups = await context.Pulses.ExistsIn(x => x.Sqid, relevantSqids.Keys)
                                          .Where(x => x.CreationTimestamp > offset)
                                          .ToLookupAsync(x => x.Sqid, cancellationToken: token);

                if (groups.Count is 0)
                {
                    return TypedResults.NotFound();
                }

                PulseOverviewStateGroup result = new(group,
                                                     groups.Select(g => new PulseOverviewStateGroupItem(g.Key,
                                                                                                        relevantSqids[g.Key],
                                                                                                        g.Select(x => new PulseStateItem(x.State,
                                                                                                                                         x.CreationTimestamp,
                                                                                                                                         x.LastUpdatedTimestamp))))
                                               );

                return TypedResults.Ok(result);
            });

            group.MapGet("application/{id}", async Task<Results<Ok<PulseDetailGroupItem>, NotFound>> (string id, PulseContext context, CancellationToken token, [FromQuery] string? continuationToken = null, [FromQuery] int pageSize = 10) =>
            {
                UniqueIdentifier? identifier = await context.UniqueIdentifiers.FindAsync(UniqueIdentifier.PartitionPulseConfiguration, id, token);

                if (identifier is null)
                {
                    return TypedResults.NotFound();
                }

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

                PulseDetailGroupItem result = new(pulse.Sqid, identifier.Name, continuationToken, entries);
                return TypedResults.Ok(result);
            });

            group.MapGet("application/{id}/states", async Task<Results<Ok<PulseStateGroupItem>, NotFound>> (string id, PulseContext context, CancellationToken token, [FromQuery] int? days = null) =>
            {
                UniqueIdentifier? identifier = await context.UniqueIdentifiers.FindAsync(UniqueIdentifier.PartitionPulseConfiguration, id, token);

                if (identifier is null)
                {
                    return TypedResults.NotFound();
                }

                var offset = DateTimeOffset.UtcNow.AddDays(-(days ?? 14));

                List<Pulse> items = await context.Pulses.Where(x => x.Sqid == id).Where(x => x.CreationTimestamp > offset).ToListAsync(token);

                if (items.Count is 0)
                {
                    return TypedResults.NotFound();
                }

                var entries = items.Select(x => new PulseStateItem(x.State, x.CreationTimestamp, x.LastUpdatedTimestamp));

                Pulse pulse = items[^1];

                PulseStateGroupItem result = new(pulse.Sqid, identifier.Name, entries);
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

            group.MapGet("application/{id}/deployments", async Task<Results<NotFound, Ok<PulseDeployments>>> (string id, PulseContext context, CancellationToken token) =>
            {
                var deployments = await context.Deployments.Where(x => x.Sqid == id)
                                               .Select(x => new PulseDeployment(x.Status,
                                                                                x.Start,
                                                                                x.End,
                                                                                x.Author,
                                                                                x.Type,
                                                                                x.CommitId,
                                                                                x.BuildNumber))
                                               .ToListAsync(token);

                if (deployments.Count is 0)
                {
                    return TypedResults.NotFound();
                }

                return TypedResults.Ok(new PulseDeployments(id, deployments));
            });
        }
    }

    private static ISelectedTableQueryable<Pulse> SelectPulseOverviewFields(TableSet<Pulse> pulses)
    {
        return pulses.SelectFields(x => new { x.Sqid, x.Message, x.State, x.CreationTimestamp, x.LastUpdatedTimestamp });
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

    private static ValueTask<Dictionary<string, string>> GetRelevantSqidsForGroup(string group, PulseContext context, CancellationToken token)
    {
        return context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration && x.Group == group)
                                        .SelectFields(x => new { x.Id, x.Name })
                                        .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken: token);
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