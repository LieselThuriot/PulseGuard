using Azure;
using Azure.Data.Tables;
using PulseGuard.Entities;

namespace PulseGuard.Services;

/// <summary>
/// Lets exactly one instance claim an interval, using a state row that holds the last claimed interval and optimistic concurrency.
/// </summary>
public sealed class IntervalClaimService(PulseContext context, ILogger<IntervalClaimService> logger)
{
    private readonly PulseContext _context = context;
    private readonly ILogger<IntervalClaimService> _logger = logger;

    public async Task<bool> TryClaimAsync(string name, DateTimeOffset interval, CancellationToken token)
    {
        try
        {
            IntervalClaim? claim = await _context.State.FindIntervalClaimAsync(name, token);
            if (claim is null)
            {
                await _context.State.AddEntityAsync(new IntervalClaim { Name = name, Interval = interval }, token);
                return true;
            }

            if (claim.Interval >= interval)
            {
                // A claim ahead of the current interval can only come from a wrong clock; it is never overwritten to avoid double scheduling
                if (claim.Interval > interval)
                {
                    _logger.IntervalClaimAhead(name, claim.Interval, interval);
                }

                return false;
            }

            // Without a real ETag the update would be unconditional and multiple instances could win
            if (claim.ETag == default || claim.ETag == ETag.All)
            {
                throw new InvalidOperationException("Interval claim was read without an ETag.");
            }

            claim.Interval = interval;
            await _context.State.UpdateEntityAsync(claim, claim.ETag, TableUpdateMode.Replace, token);
            return true;
        }
        catch (RequestFailedException ex) when (ex.Status is 409 or 412)
        {
            return false;
        }
    }
}
