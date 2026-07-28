import { computeUptime } from './uptime.util';
import { PulseOverviewItem } from '../models/pulse-overview.model';
import { PulseStates } from '../models/pulse-states.enum';
import { vi } from 'vitest';

// The 12h window is anchored to wall-clock now (Date.now() - 12h). Tests mock
// Date.now() to a fixed instant and build fixtures inside/around that window.
const NOW = '2024-06-15T12:00:00.000Z'; // window start = 2024-06-15T00:00:00Z

describe('computeUptime', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date(NOW).getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 100 when there is no data', () => {
    expect(computeUptime([])).toBe(100);
    expect(computeUptime(null as unknown as PulseOverviewItem[])).toBe(100);
  });

  it('returns 100 when everything in the window is healthy', () => {
    const items: PulseOverviewItem[] = [
      { state: PulseStates.Healthy, from: '2024-06-15T00:00:00.000Z', to: NOW },
    ];
    expect(computeUptime(items)).toBe(100);
  });

  it('is duration-weighted over the 12h window (50% healthy / 50% unhealthy)', () => {
    const items: PulseOverviewItem[] = [
      { state: PulseStates.Healthy, from: '2024-06-15T06:00:00.000Z', to: NOW },
      { state: PulseStates.Unhealthy, from: '2024-06-15T00:00:00.000Z', to: '2024-06-15T06:00:00.000Z' },
    ];
    expect(computeUptime(items)).toBeCloseTo(50, 5);
  });

  it('anchors the window to wall-clock now (Date.now() - 12h)', () => {
    // Latest data ends 2h before "now", leaving a 2h gap with no data. The
    // window still starts at now-12h, so only data at/after now-12h counts:
    // Healthy 4h (06:00->10:00) + Unhealthy 6h (clipped 00:00->06:00) = 10h -> 40%.
    // (If it anchored to the latest `to` instead, the unhealthy segment would
    // extend to 8h and the result would be ~33%.)
    const items: PulseOverviewItem[] = [
      { state: PulseStates.Healthy, from: '2024-06-15T06:00:00.000Z', to: '2024-06-15T10:00:00.000Z' },
      { state: PulseStates.Unhealthy, from: '2024-06-14T22:00:00.000Z', to: '2024-06-15T06:00:00.000Z' },
    ];
    expect(computeUptime(items)).toBeCloseTo(40, 5);
  });

  it('clips a segment that starts before the 12h cutoff', () => {
    // Unhealthy spans 18h but only the 6h inside the window counts.
    const items: PulseOverviewItem[] = [
      { state: PulseStates.Healthy, from: '2024-06-15T06:00:00.000Z', to: NOW },
      { state: PulseStates.Unhealthy, from: '2024-06-14T18:00:00.000Z', to: '2024-06-15T06:00:00.000Z' },
    ];
    expect(computeUptime(items)).toBeCloseTo(50, 5);
  });

  it('drops a segment entirely before the cutoff', () => {
    const items: PulseOverviewItem[] = [
      { state: PulseStates.Healthy, from: '2024-06-15T00:00:00.000Z', to: NOW },
      { state: PulseStates.Unhealthy, from: '2024-06-14T00:00:00.000Z', to: '2024-06-14T12:00:00.000Z' },
    ];
    expect(computeUptime(items)).toBe(100);
  });

  it('skips items missing from or to', () => {
    const items: PulseOverviewItem[] = [
      { state: PulseStates.Healthy, from: '2024-06-15T06:00:00.000Z', to: NOW },
      { state: PulseStates.Unhealthy, to: '2024-06-15T06:00:00.000Z' }, // no `from`
    ];
    expect(computeUptime(items)).toBe(100);
  });
});
