using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public sealed class WebhookService(IOptions<PulseOptions> options)
{
    //private readonly TimeSpan? _delayedWebhookInterval = options.Value.WebhookDelay is 0
    //                                                            ? null
    //                                                            : TimeSpan.FromMinutes(options.Value.Interval * options.Value.WebhookDelay);

    private readonly QueueClient _queueClient = new(options.Value.Store, "webhooks");

    public async IAsyncEnumerable<QueueMessage> ReceiveMessagesAsync([EnumeratorCancellation] CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            QueueMessage[] result = await _queueClient.ReceiveMessagesAsync(maxMessages: 32, cancellationToken: token);

            if (result.Length == 0)
            {
                break;
            }

            foreach (QueueMessage message in result)
            {
                yield return message;
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(string messageId, string popReceipt, CancellationToken token)
    {
        Response result = await _queueClient.DeleteMessageAsync(messageId, popReceipt, token);
        return !result.IsError;
    }

    public Task PostAsync(Pulse old, Pulse @new, CancellationToken token)
    {
        double? duration = (old.LastUpdatedTimestamp - old.CreationTimestamp).TotalMinutes;

        WebhookEvent webhookEvent = new()
        {
            Id = @new.Sqid,
            Group = @new.Group,
            Name = @new.Name,
            Payload = new()
            {
                OldState = old.State.Stringify(),
                NewState = @new.State.Stringify(),
                Timestamp = @new.CreationTimestamp.ToUnixTimeSeconds(),
                Duration = duration,
                Reason = @new.Message
            }
        };

        ReadOnlyMemory<byte> message = PulseSerializerContext.Default.WebhookEvent.SerializeToUtf8Bytes(webhookEvent);
        BinaryData data = new(message);

        //return _queueClient.SendMessageAsync(data, visibilityTimeout: _delayedWebhookInterval, cancellationToken: token);
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }
}