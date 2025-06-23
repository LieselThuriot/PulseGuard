using Microsoft.AspNetCore.Http.HttpResults;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Data;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class ProtoPulseRoutes
{
    public static void MapProtoPulses(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/1.0/pulses").WithTags("ProtoPulses");

        group.MapGet("details/{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, CancellationToken token) =>
        {
            var archivedItems = context.ArchivedPulseCheckResults.FindPartitionsAsync(id, token)
                                       .Select((string x, CancellationToken ct) => new ValueTask<ArchivedPulseCheckResult>(context.ArchivedPulseCheckResults.GetEntityAsync(x, id, ct)!))
                                       .SelectMany(x => x.Items)
                                       .ToListAsync(token);

            var results = await context.PulseCheckResults.Where(x => x.Sqid == id).OrderBy(x => x.Day).ToListAsync(token);

            if (results.Count is 0)
            {
                return TypedResults.NotFound();
            }

            var items = (await archivedItems).Concat(results.SelectMany(x => x.Items));

            PulseCheckResult pulseCheckResult = results[^1];
            PulseDetailResultGroup result = new(pulseCheckResult.Group, pulseCheckResult.Name, items);

            return Proto.Result(result);
        });
    }
}