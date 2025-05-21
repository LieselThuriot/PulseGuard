using Microsoft.Net.Http.Headers;
using PulseGuard.Models;
using PulseGuard.Services;
using System.Collections.Concurrent;
using System.Net.Mime;

namespace PulseGuard.Routes;

public static class EventRoutes
{
    public static void MapEvents(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/api/1.0/pulses/events").WithTags("Events");

        group.MapGet("", async (HttpContext ctx, IPulseRegistrationService pulseEventService) =>
        {
            using PulseEventListener listener = new();
            await ListenAndProcess(ctx, pulseEventService, listener);
        })
        .Produces<IAsyncEnumerable<PulseEventInfo>>(contentType: MediaTypeNames.Text.EventStream);

        group.MapGet("application/{application}", async (HttpContext ctx, IPulseRegistrationService pulseEventService, string application) =>
        {
            using FilteredPulseEventListener listener = new(x => x.Id == application);
            await ListenAndProcess(ctx, pulseEventService, listener);
        })
        .Produces<IAsyncEnumerable<PulseEventInfo>>(contentType: MediaTypeNames.Text.EventStream);

        group.MapGet("group/{group}", async (HttpContext ctx, IPulseRegistrationService pulseEventService, string group) =>
        {
            using FilteredPulseEventListener listener = new(x => x.Group == group);
            await ListenAndProcess(ctx, pulseEventService, listener);
        })
        .Produces<IAsyncEnumerable<PulseEventInfo>>(contentType: MediaTypeNames.Text.EventStream);
    }

    private static async Task ListenAndProcess(HttpContext ctx, IPulseRegistrationService pulseEventService, PulseEventListener listener)
    {
        using IDisposable registration = pulseEventService.Listen(listener);

        ctx.Response.Headers.Append(HeaderNames.ContentType, MediaTypeNames.Text.EventStream);

        await foreach (PulseEventInfo pulseEventInfo in listener.WithCancellation(ctx.RequestAborted))
        {
            await ctx.Response.WriteAsync("data: ", ctx.RequestAborted);
            await PulseSerializerContext.Default.PulseEventInfo.SerializeAsync(ctx.Response.Body, pulseEventInfo, ctx.RequestAborted);
            await ctx.Response.WriteAsync("\n\n", ctx.RequestAborted);
            await ctx.Response.Body.FlushAsync(ctx.RequestAborted);
        }
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