using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using SecureWebhooks;
using TableStorage.Linq;

namespace PulseGuard.Services.Hosted;

public class WebhookHostedService(WebhookService webhookClient, IOptions<PulseOptions> options, IHttpClientFactory factory, PulseContext context, ILogger<WebhookHostedService> logger) : BackgroundService
{
    private readonly WebhookService _queueClient = webhookClient;
    private readonly IHttpClientFactory _httpClientFactory = factory;
    private readonly PulseContext _context = context;
    private readonly int _interval = options.Value.Interval;
    //private readonly double _delayedWebhookInterval = options.Value.Interval * options.Value.WebhookDelay;
    private readonly ILogger<WebhookHostedService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        long margin = TimeSpan.FromMinutes(_interval).Ticks / 2;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                DateTime now = DateTime.UtcNow;
                DateTime next = new(now.Year, now.Month, now.Day, now.Hour, 0, 0);
                next = next.AddMinutes(((now.Minute / _interval) + 1) * _interval).AddTicks(margin);
                await Task.Delay(next - now, stoppingToken);

                HttpClient client = _httpClientFactory.CreateClient("Webhooks");

                await foreach (QueueMessage message in _queueClient.ReceiveMessagesAsync(stoppingToken))
                {
                    try
                    {
                        await Handle(client, message, stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(PulseEventIds.Webhooks, ex, "Error handling webhook for message {id}", message.MessageId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Webhooks, ex, "Error checking webhooks");
            }
        }
    }

    private async Task Handle(HttpClient client, QueueMessage message, CancellationToken cancellationToken)
    {
        await using var stream = message.Body.ToStream();

        WebhookEvent? webhookEvent = await PulseSerializerContext.Default.WebhookEvent.DeserializeAsync(stream, cancellationToken);

        if (webhookEvent is not null /*&& await IsStillRelevant(webhookEvent, cancellationToken)*/)
        {
            await foreach (Entities.Webhook webhook in _context.Webhooks.Where(x => x.Enabled &&
                                                                                   (x.Group == "*" || x.Group == webhookEvent.Group) &&
                                                                                   (x.Name == "*" || x.Name == webhookEvent.Name))
                                                               .SelectFields(x => new { x.Secret, x.Location })
                                                               .AsAsyncEnumerable().WithCancellation(cancellationToken))
            {
                await SendWebhook(client, webhook.Secret, webhook.Location, webhookEvent, cancellationToken);
            }
        }

        await _queueClient.DeleteMessageAsync(message.MessageId, message.PopReceipt, cancellationToken);
    }

    //private Task<bool> IsStillRelevant(WebhookEvent webhookEvent, CancellationToken cancellationToken)
    //{
    //    if (webhookEvent.Payload.Duration.HasValue && webhookEvent.Payload.Duration.GetValueOrDefault() < _delayedWebhookInterval)
    //    {
    //        _logger.LogWarning(PulseEventIds.Webhooks, "Webhook event {id} has a too short duration to be relevant: {duration}", webhookEvent.Id, webhookEvent.Payload.Duration.GetValueOrDefault());
    //        return Task.FromResult(false);
    //    }

    //    return CheckAsync();

    //    async Task<bool> CheckAsync()
    //    {
    //        var pulse = await _context.Pulses.Where(x => x.Sqid == webhookEvent.Id)
    //                                  .SelectFields(x => x.State)
    //                                  .FirstOrDefaultAsync(cancellationToken);
    //        if (pulse is null)
    //        {
    //            _logger.LogWarning(PulseEventIds.Webhooks, "Webhook event {id} pulse not found", webhookEvent.Id);
    //            return false;
    //        }

    //        if (pulse.State.Stringify() != webhookEvent.Payload.NewState)
    //        {
    //            _logger.LogWarning(PulseEventIds.Webhooks, "Webhook event {id} current state {state} is different from webhook state {webhookstate}", webhookEvent.Id, pulse.State.Stringify(), webhookEvent.Payload.NewState);
    //            return false;
    //        }

    //        _logger.LogInformation(PulseEventIds.Webhooks, "Webhook event {id} is still relevant", webhookEvent.Id);
    //        return true;
    //    }
    //}

    private async Task SendWebhook(HttpClient client, string secret, string location, WebhookEvent webhookEvent, CancellationToken cancellationToken)
    {
        try
        {
            StringContent content = WebhookHelpers.CreateContentWithSecureHeader(secret, webhookEvent, PulseSerializerContext.Default.WebhookEvent);
            HttpRequestMessage request = new(HttpMethod.Post, location)
            {
                Content = content
            };

            HttpResponseMessage response = await client.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug(PulseEventIds.Webhooks, "Sent webhook {Webhook}", location);
            }
            else
            {
                _logger.LogError(PulseEventIds.Webhooks, "Error sending webhook {Webhook}: {StatusCode}", location, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(PulseEventIds.Webhooks, ex, "Error sending webhook {Webhook}", location);
        }
    }
}
