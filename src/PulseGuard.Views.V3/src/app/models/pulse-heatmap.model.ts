export interface PulseHeatmap {
  day: string;
  unknown: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  timedOut: number;
}

export interface PulseHeatmaps {
  id: string;
  items: PulseHeatmap[];
}
