using Azure;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Services;

public sealed class PulseStore(PulseContext context, IdService idService, WebhookService webhookService, IOptions<PulseOptions> options, ILogger<PulseStore> logger)
{
    private readonly PulseContext _context = context;
    private readonly IdService _idService = idService;
    private readonly WebhookService _webhookService = webhookService;
    private readonly PulseOptions _options = options.Value;
    private readonly ILogger _logger = logger;

    public async Task StoreAsync(PulseReport report, long elapsedMilliseconds, CancellationToken token)
    {
        _logger.LogInformation(PulseEventIds.Store, "Storing pulse report for {Name}", report.Options.Name);

        if (string.IsNullOrEmpty(report.Options.Sqid))
        {
            _logger.LogInformation(PulseEventIds.Store, "Empty Sqid found for {Name}, generating new one.", report.Options.Name);
            await GenerateSqid(report.Options, token);
        }

        DateTimeOffset now = DateTimeOffset.UtcNow;
        DateTimeOffset start = now.AddMinutes(_options.Interval * -3);

        var pulse = await _context.Pulses.Where(x => x.Sqid == report.Options.Sqid).FirstOrDefaultAsync(token);

        Task? webhookTask = null;

        if (pulse is null || pulse.LastUpdatedTimestamp < start)
        {
            _logger.LogInformation(PulseEventIds.Store, "Creating new pulse for {Name}", report.Options.Name);
            pulse = Pulse.From(report);
        }
        else if (pulse.State == report.State && pulse.Message == report.Message && pulse.Error == report.Error)
        {
            _logger.LogInformation(PulseEventIds.Store, "Updating existing pulse for {Name}", report.Options.Name);
            pulse.LastUpdatedTimestamp = now;
        }
        else // State, message or error has changed
        {
            var oldPulse = pulse;

            _logger.LogInformation(PulseEventIds.Store, "Updating existing pulse for {Name} due to state change", report.Options.Name);
            pulse.LastUpdatedTimestamp = now;

            await _context.Pulses.UpdateEntityAsync(pulse, token);
            await _context.RecentPulses.UpdateEntityAsync(pulse, token);

            _logger.LogInformation(PulseEventIds.Store, "Creating new pulse for {Name}", report.Options.Name);
            pulse = Pulse.From(report);

            webhookTask = _webhookService.PostAsync(oldPulse, pulse, token);
        }

        await _context.Pulses.UpsertEntityAsync(pulse, token);
        await _context.RecentPulses.UpsertEntityAsync(pulse, token);

        try
        {
            (string partition, string row, BinaryData data)  = PulseCheckResult.GetAppendValue(report, elapsedMilliseconds);
            await _context.PulseCheckResults.AppendAsync(partition, row, data.ToStream(), token);
        }
        catch (Exception e)
        {
            _logger.LogError(PulseEventIds.Store, e, "Failed to append pulse check result for {Name} -- Creating a new one.", report.Options.Name);
            await _context.PulseCheckResults.UpsertEntityAsync(PulseCheckResult.From(report, elapsedMilliseconds), token);
        }

        if (webhookTask is not null)
        {
            await webhookTask;
        }
    }

    public Task CleanRecent(CancellationToken token)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        DateTimeOffset recent = now.AddMinutes(-PulseContext.RecentMinutes);

        Task cleanRecent = _context.RecentPulses.Where(x => x.LastUpdatedTimestamp < recent).BatchDeleteAsync(token);
        Task cleanResults = CleanUpPulseChecks(token);//_context.PulseCheckResults.NotExistsIn(x => x.Day, PulseCheckResult.GetPartitions()).BatchDeleteAsync(token);

        return Task.WhenAll(cleanRecent, cleanResults);
    }

    private async Task CleanUpPulseChecks(CancellationToken token)
    {
        await foreach (PulseCheckResult pulse in _context.PulseCheckResults.NotExistsIn(x => x.Day, PulseCheckResult.GetPartitions(1)).WithCancellation(token))
        {
            string year = pulse.Day[..4];
            _logger.LogInformation(PulseEventIds.Store, "Cleaning up pulse check result for {Sqid}: {Day} ( {Year} )", pulse.Sqid, pulse.Day, year);

            ArchivedPulseCheckResult? archive = await _context.ArchivedPulseCheckResults.Where(x => x.Sqid == pulse.Sqid && x.Year == year)
                                                                                        .FirstOrDefaultAsync(token);

            archive ??= new()
            {
                Year = year,
                Sqid = pulse.Sqid,
                Items = []
            };

            archive.Group = pulse.Group;
            archive.Name = pulse.Name;
            archive.Items.AddRange(pulse.Items);

            await _context.ArchivedPulseCheckResults.UpsertEntityAsync(archive, token);
            await _context.PulseCheckResults.DeleteEntityAsync(pulse, token);
        }
    }

    private async Task GenerateSqid(PulseConfiguration configuration, CancellationToken token)
    {
        string id = _idService.GetSqid(configuration);

        bool loop = true;
        int retries = 0;

        do
        {
            try
            {
                await _context.UniqueIdentifiers.AddEntityAsync(new()
                {
                    IdentifierType = UniqueIdentifiers.PartitionPulseConfiguration,
                    Id = id
                }, token);

                loop = false;
            }
            catch (RequestFailedException ex) when (retries++ <= 10)
            {
                _logger.LogWarning(PulseEventIds.Store, ex, "Sqid {Sqid} already exists, generating random one. ( Attempt {attempt} )", id, retries);
                id = _idService.GetRandomSqid();
            }
        }
        while (loop);

        configuration.Sqid = id;
        await _context.Configurations.UpdateEntityAsync(configuration, token);
    }
}