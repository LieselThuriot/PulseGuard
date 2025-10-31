using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public readonly record struct WebhookEventMessage(string Id, string PopReceipt, WebhookEvent? WebhookEvent);
public readonly record struct ThresholdWebhookEventMessage(string Id, string PopReceipt, ThresholdWebhookEvent? WebhookEvent);

public sealed class WebhookService(IOptions<PulseOptions> options)
{
    private readonly QueueClient _queueClient = new(options.Value.Store, "webhooks");
    private readonly QueueClient _thresholdQueueClient = new(options.Value.Store, "threshooks");

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

        BinaryData data = new(PulseSerializerContext.Default.WebhookEvent.SerializeToUtf8Bytes(webhookEvent));
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }

    public async IAsyncEnumerable<ThresholdWebhookEventMessage> ReceiveThresholdMessagesAsync([EnumeratorCancellation] CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            QueueMessage[] result = await _thresholdQueueClient.ReceiveMessagesAsync(maxMessages: _queueClient.MaxPeekableMessages, cancellationToken: token);

            if (result.Length == 0)
            {
                break;
            }

            foreach (QueueMessage message in result)
            {
                ThresholdWebhookEvent? webhookEvent = PulseSerializerContext.Default.ThresholdWebhookEvent.Deserialize(message.Body);
                yield return new(message.MessageId, message.PopReceipt, webhookEvent);
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(ThresholdWebhookEventMessage message)
    {
        Response result = await _thresholdQueueClient.DeleteMessageAsync(message.Id, message.PopReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public Task PostThresholdReachedAsync(Pulse pulse, DateTimeOffset since, int threshold, PulseConfiguration options, CancellationToken token)
    {
        ThresholdWebhookEvent webhookEvent = new(
            pulse.Sqid,
            options.Group,
            options.Name,
            since.ToUnixTimeSeconds(),
            threshold
        );

        BinaryData data = new(PulseSerializerContext.Default.ThresholdWebhookEvent.SerializeToUtf8Bytes(webhookEvent));
        return _thresholdQueueClient.SendMessageAsync(data, cancellationToken: token);
    }
}
