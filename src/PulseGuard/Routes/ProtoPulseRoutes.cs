using Microsoft.AspNetCore.Http.HttpResults;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Data;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class ProtoPulseRoutes
{
    private static ValueTask<T> AsValue<T>(this Task<T> task) => new(task);

    extension(IEndpointRouteBuilder builder)
    {
        public void MapProtoPulses()
        {
            builder.MapGroup("/api/1.0/pulses").WithTags("ProtoPulses").CreatePulseMappings();
            builder.MapGroup("/api/1.0/metrics").WithTags("Metrics").CreateMetricsMappings();
        }

        private void CreateMetricsMappings()
        {
            builder.MapGet("{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, CancellationToken token) =>
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

        private void CreatePulseMappings()
        {
            builder.MapGet("details/{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, CancellationToken token) =>
            {
                var info = await GetInfo(context, id, token);

                if (info is null)
                {
                    return TypedResults.NotFound();
                }

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

                PulseDetailResultGroup result = new(info.Group, info.Name, items);

                return Proto.Result(result);
            });
        }
    }
    private static Task<UniqueIdentifier?> GetInfo(PulseContext context, string id, CancellationToken token)
    {
        return context.UniqueIdentifiers.FindAsync(UniqueIdentifier.PartitionPulseConfiguration, id, token);
    }
}