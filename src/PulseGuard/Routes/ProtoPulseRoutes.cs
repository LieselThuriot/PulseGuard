using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Caching.Memory;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Data;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class ProtoPulseRoutes
{
    extension(IEndpointRouteBuilder builder)
    {
        public void MapProtoPulses()
        {
            builder.MapGroup("/api/1.0/pulses").WithTags("ProtoPulses").CreatePulseMappings();
            builder.MapGroup("/api/1.0/metrics").WithTags("Metrics").CreateMetricsMappings();
        }

        private void CreateMetricsMappings()
        {
            builder.MapGet("{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, IMemoryCache cache, CancellationToken token) =>
            {
                var results = await context.PulseAgentResults.Where(x => x.Sqid == id).OrderBy(x => x.Day).ToListAsync(token);

                if (results.Count is 0)
                {
                    return TypedResults.NotFound();
                }

                var items = results.SelectMany(x => x.Items);

                PulseMetricsResultGroup result = new(items);
                return Proto.Result(result);
            });

            builder.MapGet("{id}/archived", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, IMemoryCache cache, CancellationToken token) =>
            {
                var results = await context.PulseAgentResults.Where(x => x.Sqid == id).OrderBy(x => x.Day).ToListAsync(token);

                if (results.Count is 0)
                {
                    return TypedResults.NotFound();
                }

                var archivedItems = await cache.GetCached($"PulseMetrics-{id}", () => context.ArchivedPulseAgentResults.FindPartitionsAsync(id, token)
                                                                                             .Select((string x, CancellationToken ct) => context.ArchivedPulseAgentResults.GetEntityAsync(x, id, ct).AsValue())
                                                                                             .SelectMany(x => x!.Items)
                                                                                             .ToListAsync(token));

                var items = archivedItems.Concat(results.SelectMany(x => x.Items));

                PulseMetricsResultGroup result = new(items);
                return Proto.ImmutableResult(result);
            });
        }

        private void CreatePulseMappings()
        {
            builder.MapGet("details/{id}", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, IMemoryCache cache, CancellationToken token) =>
            {
                var info = await context.Settings.FindUniqueIdentifierAsync(id, token);

                if (info is null)
                {
                    return TypedResults.NotFound();
                }

                var results = await context.PulseCheckResults.Where(x => x.Sqid == id).OrderBy(x => x.Day).ToListAsync(token);

                if (results.Count is 0)
                {
                    return TypedResults.NotFound();
                }

                var items = results.SelectMany(x => x.Items);

                PulseDetailResultGroup result = new(info.Group, info.Name, items);

                return Proto.Result(result);
            });

            builder.MapGet("details/{id}/archived", async Task<Results<ProtoResult, NotFound>> (string id, PulseContext context, IMemoryCache cache, CancellationToken token) =>
            {
                var info = await context.Settings.FindUniqueIdentifierAsync(id, token);

                if (info is null)
                {
                    return TypedResults.NotFound();
                }

                var archivedItems = await cache.GetCached($"PulseDetals-{id}", () => context.ArchivedPulseCheckResults.FindPartitionsAsync(id, token)
                                                                                            .Select((string x, CancellationToken ct) => context.ArchivedPulseCheckResults.GetEntityAsync(x, id, ct).AsValue())
                                                                                            .SelectMany(x => x!.Items)
                                                                                            .ToListAsync(token));

                PulseDetailResultGroup result = new(info.Group, info.Name, archivedItems);

                return Proto.ImmutableResult(result);
            });
        }
    }

    private static Task<T> GetCached<T>(this IMemoryCache cache, string key, Func<ValueTask<T>> factory)
        => cache.GetOrCreateAsync(key, x =>
        {
            x.AbsoluteExpiration = DateTimeOffset.UtcNow.Date.AddDays(1).AddMinutes(-5);
            return factory().AsTask();
        })!;

    private static ValueTask<T> AsValue<T>(this Task<T> task) => new(task);
}