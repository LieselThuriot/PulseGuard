using Azure.Storage.Queues;
using Azure.Storage.Queues.Models;
using Microsoft.Extensions.Options;
using PulseGuard.Models;

namespace PulseGuard.Services;

public enum CheckJobKind
{
    Pulse,
    Agent
}

public sealed record CheckJobTarget(string PartitionKey, string RowKey);

public sealed record CheckJob(CheckJobKind Kind, string AgentType, IReadOnlyList<CheckJobTarget> Targets);

public readonly record struct CheckJobMessage(string MessageId, string PopReceipt, CheckJob? Job);

/// <summary>
/// Shared queue with one message per check, executed by every instance.
/// </summary>
public sealed class CheckJobQueue(IOptions<PulseOptions> options)
{
    private readonly QueueClient _queue = new(options.Value.Store, "checkjobs");

    public Task InitializeAsync(CancellationToken token) => _queue.CreateIfNotExistsAsync(cancellationToken: token);

    public Task SendAsync(CheckJob job, TimeSpan timeToLive, CancellationToken token)
    {
        BinaryData data = new(PulseSerializerContext.Default.CheckJob.SerializeToUtf8Bytes(job));
        return _queue.SendMessageAsync(data, timeToLive: timeToLive, cancellationToken: token);
    }

    public async Task<CheckJobMessage?> ReceiveAsync(TimeSpan visibilityTimeout, CancellationToken token)
    {
        QueueMessage? message = await _queue.ReceiveMessageAsync(visibilityTimeout, token);
        if (message is null)
        {
            return null;
        }

        CheckJob? job;
        try
        {
            job = PulseSerializerContext.Default.CheckJob.Deserialize(message.Body);
        }
        catch (Exception)
        {
            job = null;
        }

        return new CheckJobMessage(message.MessageId, message.PopReceipt, job);
    }

    public Task DeleteAsync(CheckJobMessage message) => _queue.DeleteMessageAsync(message.MessageId, message.PopReceipt, CancellationToken.None);

    /// <summary>
    /// Makes the message visible again immediately so another instance can pick it up.
    /// </summary>
    public Task ReleaseAsync(CheckJobMessage message) => _queue.UpdateMessageAsync(message.MessageId, message.PopReceipt, visibilityTimeout: TimeSpan.Zero, cancellationToken: CancellationToken.None);
}
