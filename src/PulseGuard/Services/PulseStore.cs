using Azure;
using Azure.Data.Tables;
using Microsoft.Extensions.Options;
using PulseGuard.Entities;
using PulseGuard.Models;
using TableStorage.Linq;

namespace PulseGuard.Services;

public sealed class PulseStore(PulseContext context, IdService idService, WebhookService webhookService, IPulseEventService pulseEventService, IOptions<PulseOptions> options, ILogger<PulseStore> logger)
{
    private readonly PulseContext _context = context;
    private readonly IdService _idService = idService;
    private readonly WebhookService _webhookService = webhookService;
    private readonly IPulseEventService _pulseEventService = pulseEventService;
    private readonly PulseOptions _options = options.Value;
    private readonly ILogger _logger = logger;

    public async Task StoreAsync(PulseReport report, DateTimeOffset creation, long elapsedMilliseconds, CancellationToken token)
    {
        if (string.IsNullOrEmpty(report.Options.Sqid))
        {
            _logger.LogInformation(PulseEventIds.Store, "Empty Sqid found for {Name}, generating new one.", report.Options.Name);
            await GenerateSqidAndUpdate(report.Options, token);
        }

        _logger.LogInformation(PulseEventIds.Store, "Storing pulse report for {Sqid} - {Name}", report.Options.Sqid, report.Options.Name);

        await Task.WhenAll(
            StoreBlobsAsync(report, creation, elapsedMilliseconds, token),
            StoreTablesAsync(report, creation, elapsedMilliseconds, token)
        );

        _pulseEventService.Notify(report.Options.Sqid, report.Options.Group, report.Options.Name, report.State, creation, elapsedMilliseconds);
    }

    private async Task StoreTablesAsync(PulseReport report, DateTimeOffset creation, long elapsedMilliseconds, CancellationToken token)
    {
        try
        {
            DateTimeOffset start = creation.AddMinutes(_options.Interval * -3);

            var pulse = await _context.Pulses.Where(x => x.Sqid == report.Options.Sqid).FirstOrDefaultAsync(token);

            Task? webhookTask = null;

            if (pulse is null || pulse.LastUpdatedTimestamp < start)
            {
                _logger.LogInformation(PulseEventIds.Store, "Creating new pulse for {Sqid} - {Name}", report.Options.Sqid, report.Options.Name);
                pulse = Pulse.From(report);
            }
            else if (pulse.State == report.State && pulse.Message == report.Message && pulse.Error == report.Error)
            {
                _logger.LogInformation(PulseEventIds.Store, "Updating existing pulse for {Sqid} - {Name}", report.Options.Sqid, report.Options.Name);
                pulse.LastUpdatedTimestamp = creation;
            }
            else // State, message or error has changed
            {
                var oldPulse = pulse;

                _logger.LogInformation(PulseEventIds.Store, "Updating existing pulse for {Sqid} - {Name} due to state change", report.Options.Sqid, report.Options.Name);
                pulse.LastUpdatedTimestamp = creation;

                await _context.Pulses.UpdateEntityAsync(pulse, ETag.All, TableUpdateMode.Replace, token);
                await _context.RecentPulses.UpdateEntityAsync(pulse, ETag.All, TableUpdateMode.Replace, token);

                _logger.LogInformation(PulseEventIds.Store, "Creating new pulse for {Name}", report.Options.Name);
                pulse = Pulse.From(report);

                webhookTask = _webhookService.PostAsync(oldPulse, pulse, report.Options, token);
            }

            pulse.LastElapsedMilliseconds = elapsedMilliseconds;

            await _context.Pulses.UpsertEntityAsync(pulse, TableUpdateMode.Replace, token);
            await _context.RecentPulses.UpsertEntityAsync(pulse, TableUpdateMode.Replace, token);

            var pulseCounter = await _context.PulseCounters.FindAsync(PulseCounter.FailCounter, report.Options.Sqid, token) ?? new()
            {
                ETag = ETag.All,
                Counter = PulseCounter.FailCounter,
                Sqid = report.Options.Sqid,
                Value = 0
            };

            if (report.State is not PulseStates.Healthy)
            {
                pulseCounter.Value++;
            }

            await _context.PulseCounters.UpsertEntityAsync(pulseCounter, TableUpdateMode.Replace, token);

            //Todo : Calculate based on percentage of last X checks instead of absolute count
            if (_options.AlertThreshold.HasValue && pulseCounter.Value == _options.AlertThreshold.GetValueOrDefault())
            {
                var since = DateTimeOffset.UtcNow.AddMinutes(-_options.Interval * pulseCounter.Value);
                _logger.LogCritical(PulseEventIds.Store, "Pulse {Sqid} has reached the alert threshold with {Count} failures and started at {since}.", report.Options.Sqid, pulseCounter.Value, since);
                await _webhookService.PostAsync(pulse, since, pulseCounter.Value, report.Options, token);
            }

            if (webhookTask is not null)
            {
                await webhookTask;
            }
        }
        catch (Exception e)
        {
            _logger.LogError(PulseEventIds.Store, e, "Failed to store pulse report for {Sqid} - {Name}", report.Options.Sqid, report.Options.Name);
        }
    }

    private async Task StoreBlobsAsync(PulseReport report, DateTimeOffset creation, long elapsedMilliseconds, CancellationToken token)
    {
        try
        {
            (string partition, string row, BinaryData data) = PulseCheckResult.GetAppendValue(report, creation, elapsedMilliseconds);
            await _context.PulseCheckResults.AppendAsync(partition, row, data.ToStream(), token);
        }
        catch (Exception e)
        {
            _logger.LogDebug(PulseEventIds.Store, e, "Failed to append pulse check result for {Sqid} - {Name} -- Creating a new one.", report.Options.Sqid, report.Options.Name);
            await _context.PulseCheckResults.UpsertEntityAsync(PulseCheckResult.From(report, creation, elapsedMilliseconds), token);
        }
    }

    public async Task StoreAsync(PulseAgentReport report, DateTimeOffset creation, CancellationToken token)
    {
        _logger.LogInformation(PulseEventIds.Store, "Storing agent report for {Sqid} - {Type}", report.Options.Sqid, report.Options.Type);

        try
        {
            (string partition, string row, BinaryData data) = PulseAgentCheckResult.GetAppendValue(report, creation);
            await _context.PulseAgentResults.AppendAsync(partition, row, data.ToStream(), token);
        }
        catch (Exception e)
        {
            _logger.LogDebug(PulseEventIds.Store, e, "Failed to append agent result for {Sqid} - {Type} -- Creating a new one.", report.Options.Sqid, report.Options.Type);
            await _context.PulseAgentResults.UpsertEntityAsync(PulseAgentCheckResult.From(report, creation), token);
        }
    }

    public async Task StoreAsync(DeploymentAgentReport report, CancellationToken token)
    {
        _logger.LogInformation(PulseEventIds.Store, "Storing deployment agent report for {Sqid} - {Type}", report.Options.Sqid, report.Options.Type);
        try
        {
            DeploymentResult deployment = new()
            {
                Sqid = report.Options.Sqid,
                ContinuationToken = Pulse.CreateContinuationToken(report.Start),
                Start = report.Start,
                End = report.End,
                Author = report.Author,
                Status = report.Status,
                Type = report.Type,
                CommitId = report.CommitId,
                BuildNumber = report.BuildNumber
            };

            await _context.Deployments.UpsertEntityAsync(deployment, token);
        }
        catch (Exception e)
        {
            _logger.LogError(PulseEventIds.Store, e, "Failed to store deployment agent report for {Sqid} - {Type}", report.Options.Sqid, report.Options.Type);
        }
    }

    public Task CleanRecent(CancellationToken token)
    {
        Task cleanRecent = CleanRecentTable(token);
        Task cleanPulses = CleanPulseChecks(token);
        Task cleanAgents = CleanAgentResults(token);

        return Task.WhenAll(cleanRecent, cleanPulses, cleanAgents);
    }

    private async Task CleanRecentTable(CancellationToken token)
    {
        try
        {
            DateTimeOffset now = DateTimeOffset.UtcNow;
            DateTimeOffset recent = now.AddMinutes(-PulseContext.RecentMinutes);
            await _context.RecentPulses.Where(x => x.LastUpdatedTimestamp < recent).BatchDeleteAsync(token);
        }
        catch (Exception e)
        {
            _logger.LogError(PulseEventIds.Store, e, "Failed to clean recent pulses");
        }
    }

    private async Task CleanPulseChecks(CancellationToken token)
    {
        try
        {
            string today = PulseCheckResult.GetCurrentPartition();

            await foreach (PulseCheckResult pulse in _context.PulseCheckResults.Where(x => x.Day != today).WithCancellation(token))
            {
                try
                {
                    string year = pulse.Day[..4];
                    string sqid = pulse.Sqid;

                    _logger.LogInformation(PulseEventIds.Store, "Cleaning up pulse check result for {Sqid}: {Day} ( {Year} )", sqid, pulse.Day, year);

                    ArchivedPulseCheckResult? archive = await _context.ArchivedPulseCheckResults.FindAsync(year, sqid, token);

                    archive ??= new()
                    {
                        Year = year,
                        Sqid = sqid,
                        Items = []
                    };

                    archive.Group = pulse.Group;
                    archive.Name = pulse.Name;
                    archive.Items.AddRange(pulse.Items);

                    await _context.ArchivedPulseCheckResults.UpsertEntityAsync(archive, CancellationToken.None);
                    await _context.PulseCheckResults.DeleteEntityAsync(pulse, CancellationToken.None);
                }
                catch (Exception innerEx)
                {
                    _logger.LogError(PulseEventIds.Store, innerEx, "Failed to clean up pulses for {day} - {sqid}", pulse.Day, pulse.Sqid);
                }
            }
        }
        catch (Exception outerEx)
        {
            _logger.LogError(PulseEventIds.Store, outerEx, "Failed to clean up pulses");
        }
    }

    private async Task CleanAgentResults(CancellationToken token)
    {
        try
        {
            string today = PulseAgentCheckResult.GetCurrentPartition();

            await foreach (PulseAgentCheckResult pulse in _context.PulseAgentResults.Where(x => x.Day != today).WithCancellation(token))
            {
                try
                {
                    string year = pulse.Day[..4];
                    string sqid = pulse.Sqid;

                    _logger.LogInformation(PulseEventIds.Store, "Cleaning up pulse agent result for {Sqid}: {Day} ( {Year} )", sqid, pulse.Day, year);

                    ArchivedPulseAgentCheckResult? archive = await _context.ArchivedPulseAgentResults.FindAsync(year, sqid, token);

                    archive ??= new()
                    {
                        Year = year,
                        Sqid = sqid,
                        Items = []
                    };

                    archive.Items.AddRange(pulse.Items);

                    await _context.ArchivedPulseAgentResults.UpsertEntityAsync(archive, CancellationToken.None);
                    await _context.PulseAgentResults.DeleteEntityAsync(pulse, CancellationToken.None);
                }
                catch (Exception innerEx)
                {
                    _logger.LogError(PulseEventIds.Store, innerEx, "Failed to clean up agents for {day} - {sqid}", pulse.Day, pulse.Sqid);
                }
            }
        }
        catch (Exception outerEx)
        {
            _logger.LogError(PulseEventIds.Store, outerEx, "Failed to clean up agents");
        }
    }

    private async Task GenerateSqidAndUpdate(PulseConfiguration configuration, CancellationToken token)
    {
        configuration.Sqid = await GenerateSqid(configuration.Group, configuration.Name, token);
        await _context.Configurations.UpdateEntityAsync(configuration, token);
    }

    public async Task<string> GenerateSqid(string group, string name, CancellationToken token)
    {
        string id = _idService.GetSqid(group, name);

        bool loop = true;
        int retries = 0;

        do
        {
            try
            {
                await _context.UniqueIdentifiers.AddEntityAsync(new()
                {
                    IdentifierType = UniqueIdentifier.PartitionPulseConfiguration,
                    Id = id,
                    Group = group,
                    Name = name
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

        return id;
    }
}