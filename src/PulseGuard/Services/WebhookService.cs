using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public readonly record struct WebhookEventMessage(string Id, string PopReceipt, WebhookEvent? WebhookEvent);

public sealed class WebhookService(IOptions<PulseOptions> options)
{
    //private readonly TimeSpan? _delayedWebhookInterval = options.Value.WebhookDelay is 0
    //                                                            ? null
    //                                                            : TimeSpan.FromMinutes(options.Value.Interval * options.Value.WebhookDelay);

    private readonly QueueClient _queueClient = new(options.Value.Store, "webhooks");

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
                WebhookEvent? webhookEvent = PulseSerializerContext.Default.WebhookEvent.Deserialize(message.Body);
                yield return new(message.MessageId, message.PopReceipt, webhookEvent);
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(WebhookEventMessage message)
    {
        Response result = await _queueClient.DeleteMessageAsync(message.Id, message.PopReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public Task PostAsync(Pulse old, Pulse @new, CancellationToken token)
    {
        double? duration = (old.LastUpdatedTimestamp - old.CreationTimestamp).TotalMinutes;

        WebhookEvent webhookEvent = new
        (
            @new.Sqid,
            @new.Group,
            @new.Name,
            new
            (
                old.State.Stringify(),
                @new.State.Stringify(),
                @new.CreationTimestamp.ToUnixTimeSeconds(),
                duration,
                @new.Message
            )
        );

        BinaryData data = new(PulseSerializerContext.Default.WebhookEvent.SerializeToUtf8Bytes(webhookEvent));
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }
}
