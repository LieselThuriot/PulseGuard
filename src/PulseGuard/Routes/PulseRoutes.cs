using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using PulseGuard.Entities;
using PulseGuard.Models;
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
                uint minuteOffset = minutes ?? PulseContext.RecentMinutes;
                DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-minuteOffset);

                TableSet<Pulse> set = minuteOffset > PulseContext.RecentMinutes ? context.Pulses : context.RecentPulses;
                ISelectedTableQueryable<Pulse> query = set.SelectFields(x => new { x.Sqid, x.Message, x.State, x.CreationTimestamp, x.LastUpdatedTimestamp });

                if (minuteOffset is not PulseContext.RecentMinutes)
                {
                    query = query.Where(x => x.LastUpdatedTimestamp > offset);
                }

                Dictionary<string, UniqueIdentifier> identifiers = await context.Settings.WhereUniqueIdentifier().ToDictionaryAsync(x => x.Id, cancellationToken: token);
                
                return await query.Select(x => (info: identifiers[x.Sqid], item: x))
                            .GroupBy(x => x.info.Group ?? "")
                            .Select(group =>
                                new PulseOverviewGroup(group.Key, group.GroupBy(x => new { x.info.Id, x.info.Name })
                                                                    .Select(pulses =>
                                                                    {
                                                                        var entries = pulses.Select(x => new PulseOverviewItem(x.item.State, x.item.Message, x.item.CreationTimestamp, x.item.LastUpdatedTimestamp));
                                                                        return new PulseOverviewGroupItem(pulses.Key.Id, pulses.Key.Name, entries);
                                                                    }))
                            ).ToListAsync(token);
            });

            group.MapGet("application/{id}", async Task<Results<Ok<PulseDetailGroupItem>, NotFound>> (string id, PulseContext context, CancellationToken token, [FromQuery] string? continuationToken = null, [FromQuery] int pageSize = 10) =>
            {
                UniqueIdentifier? identifier = await context.Settings.FindUniqueIdentifierAsync(id, token);

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
}