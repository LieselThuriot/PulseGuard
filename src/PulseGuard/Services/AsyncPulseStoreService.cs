using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public readonly record struct PulseEventMessage(string Id, string PopReceipt, DateTimeOffset Created, PulseEvent? PulseEvent);

public sealed class AsyncPulseStoreService(IOptions<PulseOptions> options)
{
    private readonly QueueClient _queueClient = new(options.Value.Store, "pulses");

    public async IAsyncEnumerable<PulseEventMessage> ReceiveMessagesAsync([EnumeratorCancellation] CancellationToken token)
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
                PulseEvent? pulseEvent = PulseSerializerContext.Default.PulseEvent.Deserialize(message.Body);
                DateTimeOffset creation = message.InsertedOn?.ToUniversalTime() ?? DateTimeOffset.UtcNow;
                yield return new(message.MessageId, message.PopReceipt, creation, pulseEvent);
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(PulseEventMessage message)
    {
        Response result = await _queueClient.DeleteMessageAsync(message.Id, message.PopReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public Task PostAsync(PulseReport report, long elapsedMilliseconds, CancellationToken token)
    {
        PulseEvent @event = new(elapsedMilliseconds, report);
        BinaryData data = new(PulseSerializerContext.Default.PulseEvent.SerializeToUtf8Bytes(@event));
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }
}