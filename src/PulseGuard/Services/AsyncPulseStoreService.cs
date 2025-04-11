using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public sealed class AsyncPulseStoreService(IOptions<PulseOptions> options)
{
    private readonly QueueClient _queueClient = new(options.Value.Store, "pulses");

    public async IAsyncEnumerable<(string messageId, string popReceipt, PulseEvent? pulseEvent)> ReceiveMessagesAsync([EnumeratorCancellation] CancellationToken token)
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
                //if (Proto.TryDeserialize(message, out PulseEvent? pulseEvent))
                {
                    yield return (message.MessageId, message.PopReceipt, pulseEvent);
                }
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(string messageId, string popReceipt)
    {
        Response result = await _queueClient.DeleteMessageAsync(messageId, popReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public Task PostAsync(PulseReport report, long elapsedMilliseconds, CancellationToken token)
    {
        PulseEvent @event = new()
        {
            ElapsedMilliseconds = elapsedMilliseconds,
            Report = report
        };

        BinaryData data = new(PulseSerializerContext.Default.PulseEvent.SerializeToUtf8Bytes(@event));
        //BinaryData data = Proto.Serialize(@event);
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }
}