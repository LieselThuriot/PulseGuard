using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;
using System.Collections.Concurrent;
using System.IO.Pipelines;
using System.Net.Mime;
using System.Text;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class EventRoutes
{
    public static void MapEvents(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/1.0/pulses/events").WithTags("Events");

        group.MapGet("", async (HttpResponse response, IPulseRegistrationService pulseEventService, IOptions<PulseOptions> options, PulseContext context, CancellationToken token) =>
        {
            await ProcessLastEvents(response, options, context, token);

            using PulseEventListener listener = new();
            await listener.ListenAndProcess(pulseEventService, response, token);
        })
        .Produces<IAsyncEnumerable<PulseEventInfo>>(contentType: MediaTypeNames.Text.EventStream);

        group.MapGet("application/{application}", async (HttpResponse response, IPulseRegistrationService pulseEventService, IOptions<PulseOptions> options, PulseContext context, string application, CancellationToken token) =>
        {
            await ProcessLastEvents(response, options, context, token);

            using FilteredPulseEventListener listener = new(x => x.Id == application);
            await listener.ListenAndProcess(pulseEventService, response, token);
        })
        .Produces<IAsyncEnumerable<PulseEventInfo>>(contentType: MediaTypeNames.Text.EventStream);

        group.MapGet("group/{group}", async (HttpResponse response, IPulseRegistrationService pulseEventService, IOptions<PulseOptions> options, PulseContext context, string group, CancellationToken token) =>
        {
            await ProcessLastEvents(response, options, context, token);

            using FilteredPulseEventListener listener = new(x => x.Group == group);
            await listener.ListenAndProcess(pulseEventService, response, token);
        })
        .Produces<IAsyncEnumerable<PulseEventInfo>>(contentType: MediaTypeNames.Text.EventStream);
    }

    private static async Task ProcessLastEvents(HttpResponse response, IOptions<PulseOptions> options, PulseContext context, CancellationToken token)
    {
        response.SetEventingHeader();

        DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-options.Value.Interval * 2.5);

        var identifiers = await context.UniqueIdentifiers
                                       .Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration)
                                       .ToDictionaryAsync(x => x.Id, cancellationToken: token);

        var query = context.RecentPulses.Where(x => x.LastUpdatedTimestamp > offset)
                           .SelectFields(x => new { x.Sqid, x.State, x.LastUpdatedTimestamp, x.LastElapsedMilliseconds })
                           .Select(x => (info: identifiers[x.Sqid], item: x))
                           .GroupBy(x => (x.info.Group, x.info.Id))
                           .Select(x => x.OrderByDescending(y => y.item.LastUpdatedTimestamp)
                                         .Select(x => new PulseEventInfo(x.info.Id,
                                                                         x.info.Group,
                                                                         x.info.Name,
                                                                         x.item.State,
                                                                         x.item.LastUpdatedTimestamp,
                                                                         x.item.LastElapsedMilliseconds.GetValueOrDefault()))
                                         .First());

        await foreach (PulseEventInfo pulseEventInfo in query.WithCancellation(token))
        {
            await WriteEvent(response.BodyWriter, pulseEventInfo, token);
        }
    }

    private static void SetEventingHeader(this HttpResponse response)
    {
        response.Headers.Append(HeaderNames.ContentType, MediaTypeNames.Text.EventStream);
    }

    private static async Task ListenAndProcess(this PulseEventListener listener, IPulseRegistrationService pulseEventService, HttpResponse response, CancellationToken cancellationToken)
    {
        using IDisposable registration = pulseEventService.Listen(listener);

        await foreach (PulseEventInfo pulseEventInfo in listener.WithCancellation(cancellationToken))
        {
            await WriteEvent(response.BodyWriter, pulseEventInfo, cancellationToken);
        }
    }

    private static readonly byte[] s_dataPrefix = Encoding.UTF8.GetBytes("data: ");
    private static readonly byte[] s_eventPostfix = Encoding.UTF8.GetBytes("\n\n");

    private static async Task WriteEvent(PipeWriter BodyWriter, PulseEventInfo pulseEventInfo, CancellationToken cancellationToken)
    {
        await BodyWriter.WriteAsync(s_dataPrefix, cancellationToken);
        await BodyWriter.WriteAsync(PulseSerializerContext.Default.PulseEventInfo.SerializeToUtf8Bytes(pulseEventInfo), cancellationToken);
        await BodyWriter.WriteAsync(s_eventPostfix, cancellationToken);
        await BodyWriter.FlushAsync(cancellationToken);
    }

    private sealed class FilteredPulseEventListener(Func<PulseEventInfo, bool> filter) : PulseEventListener
    {
        private readonly Func<PulseEventInfo, bool> _filter = filter;
        public override void OnPulse(PulseEventInfo pulse)
        {
            if (_filter(pulse))
            {
                base.OnPulse(pulse);
            }
        }
    }

    private class PulseEventListener : IPulseListener, IAsyncEnumerable<PulseEventInfo>, IDisposable
    {
        private readonly SemaphoreSlim _semaphore = new(0);
        private readonly ConcurrentQueue<PulseEventInfo> _queue = [];

        public void Dispose() => _semaphore.Dispose();

        public IAsyncEnumerator<PulseEventInfo> GetAsyncEnumerator(CancellationToken cancellationToken)
            => new PulseEventEnumerator(_queue, _semaphore, cancellationToken);

        public virtual void OnPulse(PulseEventInfo pulse)
        {
            _queue.Enqueue(pulse);
            _semaphore.Release();
        }
    }

    private sealed class PulseEventEnumerator(ConcurrentQueue<PulseEventInfo> queue, SemaphoreSlim semaphore, CancellationToken cancellationToken) : IAsyncEnumerator<PulseEventInfo>
    {
        private readonly ConcurrentQueue<PulseEventInfo> _queue = queue;
        private readonly SemaphoreSlim _semaphore = semaphore;
        private readonly CancellationToken _cancellationToken = cancellationToken;

        public PulseEventInfo Current { get; private set; } = default!;

        public async ValueTask<bool> MoveNextAsync()
        {
            PulseEventInfo? current;

            do
            {
                if (_cancellationToken.IsCancellationRequested)
                {
                    return false;
                }

                await _semaphore.WaitAsync(_cancellationToken);
            }
            while (!_queue.TryDequeue(out current));

            Current = current!;
            return true;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}