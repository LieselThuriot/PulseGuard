import { PulseCheckResultDetail } from '../../../models/pulse-detail.model';
import { PulseStates } from '../../../models/pulse-states.enum';

export interface TimeBucket {
  timestamp: number;
  values: number[];
  states: PulseStates[];
}

/**
 * Groups items into fixed-width time buckets, returning a Map keyed by the
 * aligned bucket timestamp, sorted ascending.
 */
export function groupByTimeBucket<T>(
  items: T[],
  decimationMinutes: number,
  getTimestamp: (item: T) => number,
): Map<number, T[]> {
  const bucketMs = decimationMinutes * 60 * 1000;
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = Math.floor(getTimestamp(item) / bucketMs) * bucketMs;
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return new Map([...map.entries()].sort(([a], [b]) => a - b));
}

/**
 * Creates time buckets from PulseCheckResultDetail items, collecting
 * elapsed milliseconds and health states per bucket.
 */
export function createBuckets(
  items: PulseCheckResultDetail[],
  decimationMinutes: number,
): TimeBucket[] {
  if (!items.length) return [];
  const grouped = groupByTimeBucket(items, decimationMinutes, (i) => i.timestamp);
  return Array.from(grouped.entries()).map(([timestamp, bucket]) => ({
    timestamp,
    values: bucket
      .filter((i) => i.elapsedMilliseconds != null)
      .map((i) => i.elapsedMilliseconds!),
    states: bucket.map((i) => i.state),
  }));
}

/**
 * Returns the Pth percentile of a numeric array.
 * When percentile === 0, returns the arithmetic mean.
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  if (percentile === 0) return values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

const STATE_PRIORITY: PulseStates[] = [
  PulseStates.Unknown,
  PulseStates.Healthy,
  PulseStates.Degraded,
  PulseStates.TimedOut,
  PulseStates.Unhealthy,
];

/** Returns the highest-severity state from an array of states. */
export function getWorstState(states: PulseStates[]): PulseStates {
  let worst = 0;
  for (const s of states) {
    const idx = STATE_PRIORITY.indexOf(s);
    if (idx > worst) worst = idx;
  }
  return STATE_PRIORITY[worst];
}
