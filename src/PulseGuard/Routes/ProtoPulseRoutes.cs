using Microsoft.AspNetCore.Http.HttpResults;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Data;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class ProtoPulseRoutes
{
    private static ValueTask<T> AsValue<T>(this Task<T> task) => new(task);

    public static void MapProtoPulses(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder pulseGroup = app.MapGroup("/api/1.0/pulses").WithTags("ProtoPulses");

        pulseGroup.MapGet("details/{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, CancellationToken token) =>
        {
            var archivedItems = context.ArchivedPulseCheckResults.FindPartitionsAsync(id, token)
                                       .Select((string x, CancellationToken ct) => context.ArchivedPulseCheckResults.GetEntityAsync(x, id, ct).AsValue())
                                       .SelectMany(x => x!.Items)
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

        RouteGroupBuilder metricsGroup = app.MapGroup("/api/1.0/metrics").WithTags("ProtoPulses");

        metricsGroup.MapGet("{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, CancellationToken token) =>
        {
            var archivedItems = context.ArchivedPulseAgentResults.FindPartitionsAsync(id, token)
                                       .Select((string x, CancellationToken ct) => context.ArchivedPulseAgentResults.GetEntityAsync(x, id, ct).AsValue())
                                       .SelectMany(x => x!.Items)
                                       .ToListAsync(token);

            var results = await context.PulseAgentResults.Where(x => x.Sqid == id).OrderBy(x => x.Day).ToListAsync(token);

            if (results.Count is 0)
            {
                return TypedResults.NotFound();
            }

            var items = (await archivedItems).Concat(results.SelectMany(x => x.Items));

            PulseMetricsResultGroup result = new(items);
            return Proto.Result(result);
        });
    }
}