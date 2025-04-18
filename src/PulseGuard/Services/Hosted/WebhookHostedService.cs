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

                Lazy<HttpClient> client = new(() => _httpClientFactory.CreateClient("Webhooks"));

                await foreach (WebhookEventMessage message in _webhookClient.ReceiveMessagesAsync(stoppingToken))
                {
                    try
                    {
                        if (message.WebhookEvent is not null)
                        {
                            await Handle(client.Value, message.WebhookEvent, stoppingToken);
                        }

                        await _webhookClient.DeleteMessageAsync(message);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(PulseEventIds.Webhooks, ex, "Error handling webhook for message {id}", message.Id);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(PulseEventIds.Webhooks, ex, "Error checking webhooks");
            }
        }
    }

    private async Task Handle(HttpClient client, WebhookEvent webhookEvent, CancellationToken cancellationToken)
    {
        string name = webhookEvent.Name;
        string group = webhookEvent.Group;

        await foreach (Entities.Webhook webhook in _context.Webhooks.Where(x => x.Enabled &&
                                                                               (x.Group == "*" || x.Group == group) &&
                                                                               (x.Name == "*" || x.Name == name))
                                                           .SelectFields(x => new { x.Secret, x.Location })
                                                           .AsAsyncEnumerable().WithCancellation(cancellationToken))
        {
            await SendWebhook(client, webhook.Secret, webhook.Location, webhookEvent, cancellationToken);
        }
    }

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