using PulseGuard.Entities;
using TableStorage.Linq;

namespace PulseGuard.Services.Hosted;

/// <summary>
/// Runs on every instance: while live (SSE) listeners are connected, polls the recent pulses and forwards new results,
/// regardless of which instance executed the check.
/// </summary>
public sealed class PulseEventRefreshHostedService(PulseContext context, IPulseEventService pulseEventService, ILogger<PulseEventRefreshHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan s_pollInterval = TimeSpan.FromSeconds(15);

    // Covers results that are stored a bit later than their timestamp
    private static readonly TimeSpan s_margin = TimeSpan.FromMinutes(1);

    private readonly PulseContext _context = context;
    private readonly IPulseEventService _pulseEventService = pulseEventService;
    private readonly ILogger<PulseEventRefreshHostedService> _logger = logger;
    private readonly Dictionary<string, DateTimeOffset> _sent = [];

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        DateTimeOffset since = DateTimeOffset.UtcNow;

        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(s_pollInterval, stoppingToken);

            if (!_pulseEventService.HasListeners)
            {
                since = DateTimeOffset.UtcNow;
                _sent.Clear();
                continue;
            }

            try
            {
                DateTimeOffset now = DateTimeOffset.UtcNow;
                List<Pulse> pulses = await _context.RecentPulses.Where(x => x.LastUpdatedTimestamp > since - s_margin).ToListAsync(stoppingToken);
                since = now;

                // On a state change the previous pulse is closed with the same timestamp, so prefer the newest pulse
                List<Pulse> updated = [.. pulses.GroupBy(x => x.Sqid)
                                                .Select(x => x.OrderByDescending(y => y.LastUpdatedTimestamp).ThenByDescending(y => y.CreationTimestamp).First())
                                                .Where(x => !_sent.TryGetValue(x.Sqid, out DateTimeOffset last) || x.LastUpdatedTimestamp > last)];
                if (updated.Count is 0)
                {
                    continue;
                }

                var identifiers = await _context.Settings.WhereUniqueIdentifier()
                                                .SelectFields(x => new { x.Id, x.Group, x.Name })
                                                .ToDictionaryAsync(x => x.Id, x => (x.Group, x.Name), cancellationToken: stoppingToken);

                foreach (Pulse pulse in updated)
                {
                    _sent[pulse.Sqid] = pulse.LastUpdatedTimestamp;

                    if (identifiers.TryGetValue(pulse.Sqid, out var identifier))
                    {
                        _pulseEventService.Notify(pulse.Sqid, identifier.Group, identifier.Name, pulse.State, pulse.LastUpdatedTimestamp, pulse.LastElapsedMilliseconds.GetValueOrDefault());
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.ErrorRefreshingLiveUpdates(ex);
            }
        }
    }
}
