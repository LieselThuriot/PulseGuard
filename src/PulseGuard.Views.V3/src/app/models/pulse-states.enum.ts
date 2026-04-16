export enum PulseStates {
  Unknown = 'Unknown',
  Healthy = 'Healthy',
  Degraded = 'Degraded',
  Unhealthy = 'Unhealthy',
  TimedOut = 'TimedOut',
}

export const STATE_COLORS: Record<PulseStates, string> = {
  [PulseStates.Healthy]: '#198754',
  [PulseStates.Degraded]: '#ffc107',
  [PulseStates.Unhealthy]: '#dc3545',
  [PulseStates.TimedOut]: '#d63384',
  [PulseStates.Unknown]: '#6c757d',
};

export const STATE_CSS_CLASSES: Record<PulseStates, string> = {
  [PulseStates.Healthy]: 'text-bg-success',
  [PulseStates.Degraded]: 'text-bg-warning',
  [PulseStates.Unhealthy]: 'text-bg-danger',
  [PulseStates.TimedOut]: 'text-bg-pink',
  [PulseStates.Unknown]: 'text-bg-secondary',
};

export const STATE_TEXT_CLASSES: Record<PulseStates, string> = {
  [PulseStates.Healthy]: 'text-success',
  [PulseStates.Degraded]: 'text-warning',
  [PulseStates.Unhealthy]: 'text-danger',
  [PulseStates.TimedOut]: 'text-pink',
  [PulseStates.Unknown]: 'text-secondary',
};
