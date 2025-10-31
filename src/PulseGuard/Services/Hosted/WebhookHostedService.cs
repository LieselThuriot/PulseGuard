using PulseGuard.Entities;
using PulseGuard.Models;
using SecureWebhooks;
using System.Text.Json.Serialization.Metadata;
using TableStorage.Linq;

namespace PulseGuard.Services.Hosted;

public class WebhookHostedService(WebhookService webhookClient, SignalService signalService, IHttpClientFactory factory, PulseContext context, ILogger<WebhookHostedService> logger) : BackgroundService
{
    private readonly WebhookService _webhookClient = webhookClient;
    private readonly SignalService _signalService = signalService;
    private readonly IHttpClientFactory _httpClientFactory = factory;
    private readonly PulseContext _context = context;
    private readonly ILogger<WebhookHostedService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _signalService.WaitAsync(stoppingToken);

                // Our search is not optimized on table side anyway, so it's most likely cheaper to just fetch all enabled webhooks and filter in memory
                IEnumerable<Entities.Webhook> webhooks = await _context.Webhooks.Where(x => x.Enabled).ToListAsync(stoppingToken);

                Lazy<HttpClient> client = new(() => _httpClientFactory.CreateClient("Webhooks"));

                await HandleThresholdWebhooks(client, webhooks, stoppingToken);
                await HandleWebhooks(client, webhooks, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Webhooks, ex, "Error checking webhooks");
            }
        }
    }

    private async Task HandleThresholdWebhooks(Lazy<HttpClient> client, IEnumerable<Entities.Webhook> webhooks, CancellationToken stoppingToken)
    {
        await foreach (ThresholdWebhookEventMessage message in _webhookClient.ReceiveThresholdMessagesAsync(stoppingToken))
        {
            try
            {
                if (message.WebhookEvent is not null)
                {
                    await Handle(client.Value, message.WebhookEvent, webhooks, stoppingToken);
                }

                await _webhookClient.DeleteMessageAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Webhooks, ex, "Error handling threshold webhook for message {id}", message.Id);
            }
        }
    }

    private static IEnumerable<Entities.Webhook> FilterWebhooks(IEnumerable<Entities.Webhook> webhooks, WebhookType type, string group, string name)
    {
        return webhooks.Where(x => (x.Type is WebhookType.All || x.Type == type) &&
                                   (x.Group == "*" || x.Group == group) &&
                                   (x.Name == "*" || x.Name == name));
    }

    private async Task Handle(HttpClient client, ThresholdWebhookEvent webhookEvent, IEnumerable<Entities.Webhook> webhooks, CancellationToken cancellationToken)
    {
        foreach (Entities.Webhook webhook in FilterWebhooks(webhooks, WebhookType.ThresholdBreach, webhookEvent.Group, webhookEvent.Name))
        {
            await Send(client, webhook.Secret, webhook.Location, webhookEvent, PulseSerializerContext.Default.ThresholdWebhookEvent, cancellationToken);
        }
    }

    private async Task HandleWebhooks(Lazy<HttpClient> client, IEnumerable<Entities.Webhook> webhooks, CancellationToken stoppingToken)
    {
        await foreach (WebhookEventMessage message in _webhookClient.ReceiveMessagesAsync(stoppingToken))
        {
            try
            {
                if (message.WebhookEvent is not null)
                {
                    await Handle(client.Value, message.WebhookEvent, webhooks, stoppingToken);
                }

                await _webhookClient.DeleteMessageAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Webhooks, ex, "Error handling webhook for message {id}", message.Id);
            }
        }
    }

    private async Task Handle(HttpClient client, WebhookEvent webhookEvent, IEnumerable<Entities.Webhook> webhooks, CancellationToken cancellationToken)
    {
        foreach (Entities.Webhook webhook in FilterWebhooks(webhooks, WebhookType.StateChange, webhookEvent.Group, webhookEvent.Name))
        {
            await Send(client, webhook.Secret, webhook.Location, webhookEvent, PulseSerializerContext.Default.WebhookEvent, cancellationToken);
        }
    }

    private async Task Send<T>(HttpClient client, string secret, string location, T webhookEvent, JsonTypeInfo<T> jsonInfo, CancellationToken cancellationToken)
    {
        try
        {
            StringContent content = WebhookHelpers.CreateContentWithSecureHeader(secret, webhookEvent, jsonInfo);
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