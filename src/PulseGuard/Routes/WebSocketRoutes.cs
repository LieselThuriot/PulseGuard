using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using PulseGuard.Services;
using System.Diagnostics;
using System.Net.WebSockets;
using TableStorage.Linq;

namespace PulseGuard.Routes;

public static class WebSocketRoutes
{
    public static void MapWebSockets(this IEndpointRouteBuilder app)
    {
        RouteGroupBuilder group = app.MapGroup("/ws").WithTags("Events");

        group.MapGet("", async (HttpContext context, IPulseRegistrationService pulseEventService, IOptions<PulseOptions> options, PulseContext dbContext, CancellationToken token) =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await HandleWebSocketConnection(webSocket, pulseEventService, options, dbContext, null, null, token);
        });

        group.MapGet("application/{application}", async (HttpContext context, IPulseRegistrationService pulseEventService, IOptions<PulseOptions> options, PulseContext dbContext, string application, CancellationToken token) =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await HandleWebSocketConnection(webSocket, pulseEventService, options, dbContext, application, null, token);
        });

        group.MapGet("group/{group}", async (HttpContext context, IPulseRegistrationService pulseEventService, IOptions<PulseOptions> options, PulseContext dbContext, string group, CancellationToken token) =>
        {
            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            using WebSocket webSocket = await context.WebSockets.AcceptWebSocketAsync();
            await HandleWebSocketConnection(webSocket, pulseEventService, options, dbContext, null, group, token);
        });
    }

    private static async Task HandleWebSocketConnection(WebSocket webSocket, IPulseRegistrationService pulseEventService,
        IOptions<PulseOptions> options, PulseContext context, string? application, string? group, CancellationToken token)
    {
        // First send historical events
        await SendHistoricalEvents(webSocket, options, context, application, group, token);

        // Create appropriate listener based on filter parameters
        PulseEventListener listener = GetListener(webSocket, application, group, token);

        // Register for pulse events
        using (pulseEventService.Listen(listener))
        {
            try
            {
                // Keep the connection open until the client disconnects or the token is canceled
                byte[] buffer = new byte[1024];
                WebSocketReceiveResult result;

                while (webSocket.State == WebSocketState.Open && !token.IsCancellationRequested)
                {
                    // Use a receive operation with a timeout to detect closed connections
                    var receiveTask = webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), token);

                    // Add a timeout so we can periodically check the cancellation token
                    if (await Task.WhenAny(receiveTask, Task.Delay(1000, token)) == receiveTask)
                    {
                        result = await receiveTask;
                        if (result.MessageType is WebSocketMessageType.Close)
                        {
                            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Connection closed by client", token);
                            break;
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                // Normal cancellation, exit gracefully
                if (webSocket.State is WebSocketState.Open)
                {
                    try
                    {
                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Server is shutting down", CancellationToken.None);
                    }
                    catch
                    {
                        // Ignore any error during graceful close
                    }
                }
            }
            catch (WebSocketException)
            {
                // Socket likely closed by client, exit gracefully
            }
            catch (Exception)
            {
                // Handle unexpected exceptions - the socket may be in a bad state
                if (webSocket.State is WebSocketState.Open)
                {
                    try
                    {
                        await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "An error occurred", CancellationToken.None);
                    }
                    catch
                    {
                        // Ignore any error during graceful close
                    }
                }
            }
        }
    }

    private static PulseEventListener GetListener(WebSocket webSocket, string? application, string? group, CancellationToken token)
    {
        if (application is not null)
        {
            return new PulseEventListener(webSocket, x => x.Id == application, token);
        }

        if (group is not null)
        {
            return new PulseEventListener(webSocket, x => x.Group == group, token);
        }

        return new PulseEventListener(webSocket, token);
    }

    private static async Task SendHistoricalEvents(WebSocket webSocket,
                                                   IOptions<PulseOptions> options,
                                                   PulseContext context,
                                                   string? application,
                                                   string? group,
                                                   CancellationToken token)
    {
        DateTimeOffset offset = DateTimeOffset.UtcNow.AddMinutes(-options.Value.Interval * 2.5);

        var query = context.RecentPulses.Where(x => x.LastUpdatedTimestamp > offset);
        var identifiers = context.UniqueIdentifiers.Where(x => x.IdentifierType == UniqueIdentifier.PartitionPulseConfiguration);

        if (application is not null)
        {
            query = query.Where(x => x.Sqid == application);
            identifiers = identifiers.Where(x => x.Id == application);
        }
        else if (group is not null)
        {
            query = query.Where(x => x.Group == group);
            identifiers = identifiers.Where(x => x.Group == group);
        }
        
        var info = await identifiers.ToDictionaryAsync(x => x.Id, cancellationToken: token);

        var groupedQuery = query.SelectFields(x => new { x.Sqid, x.State, x.LastUpdatedTimestamp, x.LastElapsedMilliseconds })
                                .Select(x => (info: info[x.Sqid], item: x))
                                .GroupBy(x => (x.info.Group, x.info.Id))
                                .Select(x => x.OrderByDescending(y => y.item.LastUpdatedTimestamp).First())
                                .OrderBy(x => x.info.Group + x.info.Id)
                                .Select(x => new PulseEventInfo(x.info.Id,
                                                                x.info.Group,
                                                                x.info.Name,
                                                                x.item.State,
                                                                x.item.LastUpdatedTimestamp,
                                                                x.item.LastElapsedMilliseconds.GetValueOrDefault()));

        await foreach (PulseEventInfo pulseEventInfo in groupedQuery.WithCancellation(token))
        {
            await SendWebSocketEvent(webSocket, pulseEventInfo, token);
        }
    }

    private static async Task SendWebSocketEvent(WebSocket webSocket, PulseEventInfo pulseEventInfo, CancellationToken token)
    {
        if (webSocket.State is not WebSocketState.Open || token.IsCancellationRequested)
        {
            return;
        }

        try
        {
            byte[] buffer = PulseSerializerContext.Default.PulseEventInfo.SerializeToUtf8Bytes(pulseEventInfo);
            await webSocket.SendAsync(buffer, WebSocketMessageType.Text, true, token);
        }
        catch (WebSocketException)
        {
            // Socket likely closed by client, exit gracefully
        }
        catch (OperationCanceledException)
        {
            // Normal cancellation, exit gracefully
        }
        catch (Exception)
        {
            // Intentionally swallow exceptions at this level since:
            // 1. This may be called from a fire-and-forget context in OnPulse
            // 2. The connection handler will detect socket state changes separately
            // 3. Individual event failures shouldn't break the whole connection
            Debug.WriteLine($"Error sending WebSocket event: {pulseEventInfo.Id} - {pulseEventInfo.Name}");
        }
    }

    private sealed class PulseEventListener : IPulseListener
    {
        private readonly WebSocket _webSocket;
        private readonly Func<PulseEventInfo, bool>? _filter;
        private readonly CancellationToken _cancellationToken;

        public PulseEventListener(WebSocket webSocket, CancellationToken cancellationToken)
        {
            _webSocket = webSocket;
            _filter = null;
            _cancellationToken = cancellationToken;
        }

        public PulseEventListener(WebSocket webSocket, Func<PulseEventInfo, bool> filter, CancellationToken cancellationToken)
        {
            _webSocket = webSocket;
            _filter = filter;
            _cancellationToken = cancellationToken;
        }

        // Non-async method to avoid fire-and-forget async void
        public void OnPulse(PulseEventInfo pulse)
        {
            if (_webSocket.State is not WebSocketState.Open || _cancellationToken.IsCancellationRequested)
            {
                return;
            }

            if (_filter is not null && !_filter(pulse))
            {
                return;
            }

            // Use a separate Task to handle the async sending logic
            // We don't await this as the IPulseListener interface requires a void return type
            // The method handles its own exceptions internally
            _ = SendWebSocketEvent(_webSocket, pulse, _cancellationToken);
        }
    }
}