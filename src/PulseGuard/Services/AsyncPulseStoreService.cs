using Azure;
using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Models;
using System.Runtime.CompilerServices;

namespace PulseGuard.Services;

public readonly record struct PulseEventMessage(string Id, string PopReceipt, DateTimeOffset Created, PulseEvent? PulseEvent);
public readonly record struct PulseAgentEventMessage(string Id, string PopReceipt, DateTimeOffset Created, AgentReport? AgentReport);

public sealed class AsyncPulseStoreService(IOptions<PulseOptions> options)
{
    private readonly QueueClient _queueClient = new(options.Value.Store, "pulses");
    private readonly QueueClient _agentQueueClient = new(options.Value.Store, "agents");

    public async IAsyncEnumerable<PulseEventMessage> ReceiveMessagesAsync([EnumeratorCancellation] CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            QueueMessage[] result = await _queueClient.ReceiveMessagesAsync(maxMessages: _queueClient.MaxPeekableMessages, cancellationToken: token);

            if (result.Length is 0)
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

    public async IAsyncEnumerable<PulseAgentEventMessage> ReceiveAgentMessagesAsync([EnumeratorCancellation] CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
            QueueMessage[] result = await _agentQueueClient.ReceiveMessagesAsync(maxMessages: _agentQueueClient.MaxPeekableMessages, cancellationToken: token);

            if (result.Length is 0)
            {
                break;
            }

            foreach (QueueMessage message in result)
            {
                AgentReport? agentEvent = PulseSerializerContext.Default.AgentReport.Deserialize(message.Body);

                DateTimeOffset creation = message.InsertedOn?.ToUniversalTime() ?? DateTimeOffset.UtcNow;
                yield return new(message.MessageId, message.PopReceipt, creation, agentEvent);
            }
        }
    }

    public async Task<bool> DeleteMessageAsync(PulseEventMessage message)
    {
        Response result = await _queueClient.DeleteMessageAsync(message.Id, message.PopReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public async Task<bool> DeleteMessageAsync(PulseAgentEventMessage message)
    {
        Response result = await _agentQueueClient.DeleteMessageAsync(message.Id, message.PopReceipt, CancellationToken.None);
        return !result.IsError;
    }

    public Task PostAsync(PulseReport report, long elapsedMilliseconds, CancellationToken token)
    {
        PulseEvent @event = new(elapsedMilliseconds, report);
        BinaryData data = new(PulseSerializerContext.Default.PulseEvent.SerializeToUtf8Bytes(@event));
        return _queueClient.SendMessageAsync(data, cancellationToken: token);
    }

    public async Task PostAsync(IReadOnlyList<AgentReport> reports, CancellationToken token)
    {
        foreach (PulseAgentReport report in reports)
        {
            await PostAsync(report, token);
        }
    }

    public Task PostAsync(AgentReport report, CancellationToken token)
    {
        BinaryData data = new(report.GetTypeInfo().SerializeToUtf8Bytes(report));
        return _agentQueueClient.SendMessageAsync(data, cancellationToken: token);
    }
}