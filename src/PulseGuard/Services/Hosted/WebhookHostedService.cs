using PulseGuard.Entities;
using PulseGuard.Models;
using SecureWebhooks;
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
                ILookup<WebhookType, Entities.Webhook> webhooks = await _context.Webhooks.Where(x => x.Enabled)
                                                                                         .ToLookupAsync(x => x.Type, cancellationToken: stoppingToken);

                await HandleWebhooks(webhooks, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.ErrorCheckingWebhooks(ex);
            }
        }
    }

    private static IEnumerable<Entities.Webhook> FilterWebhooks(IEnumerable<Entities.Webhook> webhooks, string group, string name)
    {
        return webhooks.Where(x => (x.Group == "*" || x.Group == group) && (x.Name == "*" || x.Name == name));
    }

    private async Task Handle(HttpClient client, ThresholdWebhookEvent webhookEvent, IEnumerable<Entities.Webhook> webhooks, CancellationToken cancellationToken)
    {
        foreach (Entities.Webhook webhook in FilterWebhooks(webhooks, webhookEvent.Group, webhookEvent.Name))
        {
            await Send(client, webhook.Secret, webhook.Location, webhookEvent, cancellationToken);
        }
    }

    private async Task HandleWebhooks(ILookup<WebhookType, Entities.Webhook> webhooks, CancellationToken stoppingToken)
    {
        Lazy<HttpClient> client = new(() => _httpClientFactory.CreateClient("Webhooks"));
        IEnumerable<Entities.Webhook> allHooks = webhooks[WebhookType.All];

        await foreach (WebhookEventMessage message in _webhookClient.ReceiveMessagesAsync(stoppingToken))
        {
            try
            {
                if (message.WebhookEvent is WebhookEvent webhookEvent)
                {
                    var relevantHooks = webhooks[WebhookType.StateChange].Concat(allHooks);
                    await Handle(client.Value, webhookEvent, relevantHooks, stoppingToken);
                }
                else if (message.WebhookEvent is ThresholdWebhookEvent thresholdWebhookEvent)
                {
                    var relevantHooks = webhooks[WebhookType.ThresholdBreach].Concat(allHooks);
                    await Handle(client.Value, thresholdWebhookEvent, relevantHooks, stoppingToken);
                }
                else
                {
                    _logger.UnknownWebhookEventType(message.Id);
                }

                await _webhookClient.DeleteMessageAsync(message);
            }
            catch (Exception ex)
            {
                _logger.ErrorHandlingWebhook(ex, message.Id);
            }
        }
    }

    private async Task Handle(HttpClient client, WebhookEvent webhookEvent, IEnumerable<Entities.Webhook> webhooks, CancellationToken cancellationToken)
    {
        foreach (Entities.Webhook webhook in FilterWebhooks(webhooks, webhookEvent.Group, webhookEvent.Name))
        {
            await Send(client, webhook.Secret, webhook.Location, webhookEvent, cancellationToken);
        }
    }

    private async Task Send<T>(HttpClient client, string secret, string location, T webhookEvent, CancellationToken cancellationToken)
        where T : WebhookEventBase
    {
        try
        {
            StringContent content = WebhookHelpers.CreateContentWithSecureHeader(secret, webhookEvent, PulseSerializerContext.Default.WebhookEventBase);
            HttpRequestMessage request = new(HttpMethod.Post, location)
            {
                Content = content
            };

            HttpResponseMessage response = await client.SendAsync(request, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.SentWebhook(location);
            }
            else
            {
                _logger.ErrorSendingWebhookWithStatus(location, (int)response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.ErrorSendingWebhook(ex, location);
        }
    }
}