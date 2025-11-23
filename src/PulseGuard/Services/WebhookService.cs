using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public readonly record struct WebhookEventMessage(string Id, string PopReceipt, WebhookEventBase? WebhookEvent);

public sealed class WebhookService(IOptions<PulseOptions> options, ILogger<WebhookService> logger)
{
    private readonly QueueClient _queueClient = new(options.Value.Store, "webhooks");
    private readonly ILogger<WebhookService> _logger = logger;

    public async IAsyncEnumerable<WebhookEventMessage> ReceiveMessagesAsync([EnumeratorCancellation] CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            QueueMessage[] result = await _queueClient.ReceiveMessagesAsync(maxMessages: _queueClient.MaxPeekableMessages, cancellationToken: token);

            if (result.Length == 0)
            {
                break;
            }

            foreach (QueueMessage message in result)
            {
                WebhookEventBase? webhookEvent;

                try
                {
                    webhookEvent = PulseSerializerContext.Default.WebhookEventBase.Deserialize(message.Body);
                }
                catch (Exception ex)
                {
                    _logger.FailedToDeserializeWebhookEvent(ex, message.MessageId, message.Body.ToString());
                    webhookEvent = null;
                }

                yield return new(message.MessageId, message.PopReceipt, webhookEvent);
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(WebhookEventMessage message)
    {
        Response result = await _queueClient.DeleteMessageAsync(message.Id, message.PopReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public Task PostAsync(Pulse old, Pulse @new, PulseConfiguration options, CancellationToken token)
    {
        double? duration = (old.LastUpdatedTimestamp - old.CreationTimestamp).TotalMinutes;

        WebhookEvent webhookEvent = new
        (
            @new.Sqid,
            options.Group,
            options.Name,
            new
            (
                old.State.Stringify(),
                @new.State.Stringify(),
                @new.CreationTimestamp.ToUnixTimeSeconds(),
                duration,
                @new.Message
            )
        );

        return PostAsync(webhookEvent, token);
    }

    public Task PostAsync(Pulse pulse, DateTimeOffset since, int threshold, PulseConfiguration options, CancellationToken token)
    {
        ThresholdWebhookEvent webhookEvent = new(
            pulse.Sqid,
            options.Group,
            options.Name,
            since.ToUnixTimeSeconds(),
            threshold
        );

        return PostAsync(webhookEvent, token);
    }

    private Task PostAsync(WebhookEventBase webhookEvent, CancellationToken token)
    {
        BinaryData data = new(PulseSerializerContext.Default.WebhookEventBase.SerializeToUtf8Bytes(webhookEvent));
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }
}
