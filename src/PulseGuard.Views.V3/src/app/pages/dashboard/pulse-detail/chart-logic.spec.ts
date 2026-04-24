import { PulseStates } from '../../../models/pulse-states.enum';
import { PulseCheckResultDetail } from '../../../models/pulse-detail.model';

/**
 * The stats, createBuckets, calculatePercentile, and getWorstState logic lives in
 * PulseDetailComponent and ResponseChartComponent as private methods / computed signals.
 * We extract and re-implement the pure functions here to test their logic in isolation.
 */

// ── Extracted from ResponseChartComponent ──

interface TimeBucket {
  timestamp: number;
  values: number[];
  states: PulseStates[];
}

function createBuckets(items: PulseCheckResultDetail[], decimationMinutes: number): TimeBucket[] {
  if (!items.length) return [];
  const bucketMs = decimationMinutes * 60 * 1000;
  const map = new Map<number, TimeBucket>();
  for (const item of items) {
    const key = Math.floor(item.timestamp / bucketMs) * bucketMs;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { timestamp: key, values: [], states: [] };
      map.set(key, bucket);
    }
    if (item.elapsedMilliseconds != null) bucket.values.push(item.elapsedMilliseconds);
    bucket.states.push(item.state);
  }
  return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
}

function calculatePercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  if (percentile === 0) return values.reduce((a, b) => a + b, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function getWorstState(states: PulseStates[]): PulseStates {
  const priority = [PulseStates.Unknown, PulseStates.Healthy, PulseStates.Degraded, PulseStates.TimedOut, PulseStates.Unhealthy];
  let worst = 0;
  for (const s of states) {
    const idx = priority.indexOf(s);
    if (idx > worst) worst = idx;
  }
  return priority[worst];
}

// ── Extracted from PulseDetailComponent.stats ──

function computeStats(items: PulseCheckResultDetail[]) {
  if (!items.length) return { since: '...', average: '...', uptime: '...', errorRate: '...', timeoutRate: '...', volatility: '...' };

  const first = items[0];
  const since = new Date(first.timestamp).toLocaleString();

  const withElapsed = items.filter((i) => i.elapsedMilliseconds != null && i.elapsedMilliseconds! > 0);
  const avgMs = withElapsed.length > 0
    ? withElapsed.reduce((sum, i) => sum + (i.elapsedMilliseconds ?? 0), 0) / withElapsed.length
    : 0;
  const average = avgMs > 0 ? `${avgMs.toFixed(0)} ms` : 'N/A';

  const total = items.length;
  const healthy = items.filter((i) => i.state === PulseStates.Healthy).length;
  const unhealthy = items.filter((i) => i.state === PulseStates.Unhealthy).length;
  const timedOut = items.filter((i) => i.state === PulseStates.TimedOut).length;

  const uptime = `${((healthy / total) * 100).toFixed(2)}%`;
  const errorRate = `${((unhealthy / total) * 100).toFixed(2)}%`;
  const timeoutRate = `${((timedOut / total) * 100).toFixed(2)}%`;

  let transitions = 0;
  for (let i = 1; i < items.length; i++) {
    if (items[i].state !== items[i - 1].state) transitions++;
  }
  const volatility = total > 1 ? `${((transitions / (total - 1)) * 100).toFixed(2)}%` : 'N/A';

  return { since, average, uptime, errorRate, timeoutRate, volatility };
}

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('createBuckets', () => {
  it('should return empty for no items', () => {
    expect(createBuckets([], 15)).toEqual([]);
  });

  it('should group items into time buckets', () => {
    const base = 900_000; // 15 min in ms — aligns to bucket 0
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: base + 0, elapsedMilliseconds: 100 },
      { state: PulseStates.Healthy, timestamp: base + 60_000, elapsedMilliseconds: 200 },
      { state: PulseStates.Degraded, timestamp: base + 1_000_000, elapsedMilliseconds: 500 },
    ];
    const buckets = createBuckets(items, 15);
    expect(buckets.length).toBe(2);
    expect(buckets[0].values).toEqual([100, 200]);
    expect(buckets[1].values).toEqual([500]);
  });

  it('should sort buckets by timestamp', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 2_000_000, elapsedMilliseconds: 50 },
      { state: PulseStates.Healthy, timestamp: 100_000, elapsedMilliseconds: 10 },
    ];
    const buckets = createBuckets(items, 15);
    expect(buckets[0].timestamp).toBeLessThan(buckets[1].timestamp);
  });

  it('should skip null elapsedMilliseconds in values but still add state', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Unhealthy, timestamp: 900_000 },
    ];
    const buckets = createBuckets(items, 15);
    expect(buckets[0].values).toEqual([]);
    expect(buckets[0].states).toEqual([PulseStates.Unhealthy]);
  });
});

describe('calculatePercentile', () => {
  it('should return 0 for empty values', () => {
    expect(calculatePercentile([], 99)).toBe(0);
  });

  it('should return the average when percentile is 0', () => {
    expect(calculatePercentile([10, 20, 30], 0)).toBe(20);
  });

  it('should return max for p100', () => {
    expect(calculatePercentile([10, 20, 30, 40, 50], 100)).toBe(50);
  });

  it('should return median-ish for p50', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const result = calculatePercentile(values, 50);
    expect(result).toBe(50);
  });

  it('should return p99 of a large set', () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = calculatePercentile(values, 99);
    expect(result).toBe(99);
  });

  it('should handle single value', () => {
    expect(calculatePercentile([42], 99)).toBe(42);
  });

  it('should not mutate the input array', () => {
    const values = [30, 10, 20];
    calculatePercentile(values, 50);
    expect(values).toEqual([30, 10, 20]);
  });
});

describe('getWorstState', () => {
  it('should return Unhealthy as the worst state', () => {
    expect(getWorstState([PulseStates.Healthy, PulseStates.Unhealthy, PulseStates.Degraded])).toBe(PulseStates.Unhealthy);
  });

  it('should return TimedOut over Degraded', () => {
    expect(getWorstState([PulseStates.Degraded, PulseStates.TimedOut])).toBe(PulseStates.TimedOut);
  });

  it('should return Degraded over Healthy', () => {
    expect(getWorstState([PulseStates.Healthy, PulseStates.Degraded])).toBe(PulseStates.Degraded);
  });

  it('should return Healthy over Unknown', () => {
    expect(getWorstState([PulseStates.Unknown, PulseStates.Healthy])).toBe(PulseStates.Healthy);
  });

  it('should handle single-state array', () => {
    expect(getWorstState([PulseStates.Healthy])).toBe(PulseStates.Healthy);
  });

  it('should treat Unhealthy as worse than TimedOut', () => {
    expect(getWorstState([PulseStates.TimedOut, PulseStates.Unhealthy])).toBe(PulseStates.Unhealthy);
  });
});

describe('computeStats (pulse-detail stats computed)', () => {
  it('should return placeholder strings for empty items', () => {
    const stats = computeStats([]);
    expect(stats.uptime).toBe('...');
    expect(stats.errorRate).toBe('...');
    expect(stats.volatility).toBe('...');
  });

  it('should compute 100% uptime when all healthy', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000, elapsedMilliseconds: 100 },
      { state: PulseStates.Healthy, timestamp: 2000, elapsedMilliseconds: 150 },
      { state: PulseStates.Healthy, timestamp: 3000, elapsedMilliseconds: 200 },
    ];
    const stats = computeStats(items);
    expect(stats.uptime).toBe('100.00%');
    expect(stats.errorRate).toBe('0.00%');
    expect(stats.timeoutRate).toBe('0.00%');
    expect(stats.volatility).toBe('0.00%');
  });

  it('should compute correct error rate', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000 },
      { state: PulseStates.Unhealthy, timestamp: 2000 },
      { state: PulseStates.Healthy, timestamp: 3000 },
      { state: PulseStates.Unhealthy, timestamp: 4000 },
    ];
    const stats = computeStats(items);
    expect(stats.uptime).toBe('50.00%');
    expect(stats.errorRate).toBe('50.00%');
  });

  it('should compute timeout rate', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000 },
      { state: PulseStates.TimedOut, timestamp: 2000 },
    ];
    const stats = computeStats(items);
    expect(stats.timeoutRate).toBe('50.00%');
  });

  it('should compute average response time', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000, elapsedMilliseconds: 100 },
      { state: PulseStates.Healthy, timestamp: 2000, elapsedMilliseconds: 300 },
    ];
    const stats = computeStats(items);
    expect(stats.average).toBe('200 ms');
  });

  it('should show N/A average when no elapsed data', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000 },
    ];
    const stats = computeStats(items);
    expect(stats.average).toBe('N/A');
  });

  it('should compute volatility for alternating states', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000 },
      { state: PulseStates.Unhealthy, timestamp: 2000 },
      { state: PulseStates.Healthy, timestamp: 3000 },
      { state: PulseStates.Unhealthy, timestamp: 4000 },
    ];
    const stats = computeStats(items);
    // 3 transitions out of 3 gaps = 100%
    expect(stats.volatility).toBe('100.00%');
  });

  it('should show N/A volatility for single item', () => {
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000 },
    ];
    const stats = computeStats(items);
    expect(stats.volatility).toBe('N/A');
  });

  it('should compute partial volatility', () => {
    // H → H → U → U → H = 2 transitions / 4 gaps = 50%
    const items: PulseCheckResultDetail[] = [
      { state: PulseStates.Healthy, timestamp: 1000 },
      { state: PulseStates.Healthy, timestamp: 2000 },
      { state: PulseStates.Unhealthy, timestamp: 3000 },
      { state: PulseStates.Unhealthy, timestamp: 4000 },
      { state: PulseStates.Healthy, timestamp: 5000 },
    ];
    const stats = computeStats(items);
    expect(stats.volatility).toBe('50.00%');
  });
});
