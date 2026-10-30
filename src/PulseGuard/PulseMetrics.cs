using PulseGuard.Checks;
using PulseGuard.Models;
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace PulseGuard;

internal static class PulseMetrics
{
    public const string MeterName = "PulseGuard";

    private static readonly Meter s_meter = new(MeterName);

    private static readonly InstrumentAdvice<double> s_durationAdvice = new()
    {
        HistogramBucketBoundaries = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60]
    };

    private static readonly Histogram<double> s_checkDuration = s_meter.CreateHistogram(
        "pulseguard.check.duration", "s", "Duration of pulse checks, by check type and resulting state.", advice: s_durationAdvice);

    private static readonly Histogram<double> s_agentDuration = s_meter.CreateHistogram(
        "pulseguard.agent.duration", "s", "Duration of agent checks, by agent type and outcome.", advice: s_durationAdvice);

    private static readonly Counter<long> s_stateChanges = s_meter.CreateCounter<long>(
        "pulseguard.check.state_changes", "{change}", "Pulse checks whose state, message or error changed, by new state.");

    private static readonly Counter<long> s_thresholdsReached = s_meter.CreateCounter<long>(
        "pulseguard.check.alert_thresholds", "{alert}", "Pulse checks that reached the alert threshold.");

    private static readonly Counter<long> s_jobsScheduled = s_meter.CreateCounter<long>(
        "pulseguard.jobs.scheduled", "{job}", "Check jobs successfully queued by the instance that claimed the interval, by kind.");

    private static readonly Counter<long> s_jobsProcessed = s_meter.CreateCounter<long>(
        "pulseguard.jobs.processed", "{job}", "Check jobs taken from the queue, by outcome.");

    private static readonly Counter<long> s_webhooksSent = s_meter.CreateCounter<long>(
        "pulseguard.webhooks.sent", "{webhook}", "Webhook deliveries, by event and outcome.");

    public static void RecordCheck(PulseCheckType type, PulseStates state, TimeSpan duration) =>
        s_checkDuration.Record(duration.TotalSeconds, new TagList
        {
            { "pulseguard.check.type", type.Stringify() },
            { "pulseguard.check.state", state.Stringify() }
        });

    public static void RecordAgent(string type, string outcome, TimeSpan duration) =>
        s_agentDuration.Record(duration.TotalSeconds, new TagList
        {
            { "pulseguard.agent.type", type },
            { "pulseguard.outcome", outcome }
        });

    public static void RecordStateChange(PulseStates state) =>
        s_stateChanges.Add(1, new KeyValuePair<string, object?>("pulseguard.check.state", state.Stringify()));

    public static void RecordAlertThreshold() => s_thresholdsReached.Add(1);

    public static void RecordJobScheduled(string kind) =>
        s_jobsScheduled.Add(1, new KeyValuePair<string, object?>("pulseguard.job.kind", kind));

    public static void RecordJobProcessed(string outcome) =>
        s_jobsProcessed.Add(1, new KeyValuePair<string, object?>("pulseguard.outcome", outcome));

    public static void RecordWebhook(string webhookEvent, string outcome) =>
        s_webhooksSent.Add(1, new TagList
        {
            { "pulseguard.webhook.event", webhookEvent },
            { "pulseguard.outcome", outcome }
        });
}
