import { PulseStates } from '../models/pulse-states.enum';
import { PulseOverviewItem } from '../models/pulse-overview.model';
import { TWELVE_HOURS_MS } from '../constants';

/**
 * Computes uptime percentage over a rolling 12-hour window.
 *
 * The denominator is the total time actually covered by the returned
 * intervals (not the full fixed window), so gaps in monitoring data
 * do not artificially reduce the percentage.
 *
 * Returns 100 when there is no data (assumed healthy).
 */
export function computeUptime(items: PulseOverviewItem[]): number {
  if (!items?.length) return 100;

  const twelveHoursAgo = Date.now() - TWELVE_HOURS_MS;
  let totalDuration = 0;
  let healthyDuration = 0;

  for (const item of items) {
    if (!item.from || !item.to) continue;
    const from = Math.max(new Date(item.from).getTime(), twelveHoursAgo);
    const to = new Date(item.to).getTime();
    const duration = to - from;
    if (duration <= 0) continue;

    totalDuration += duration;
    if (item.state === PulseStates.Healthy) healthyDuration += duration;
  }

  return totalDuration > 0 ? (healthyDuration / totalDuration) * 100 : 100;
}
