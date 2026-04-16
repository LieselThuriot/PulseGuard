import { PulseStates } from './pulse-states.enum';

export interface PulseCheckResultDetail {
  state: PulseStates;
  timestamp: number;
  elapsedMilliseconds?: number;
}

export interface PulseDetailResultGroup {
  group: string;
  name: string;
  items: PulseCheckResultDetail[];
}

export interface PulseAgentCheckResultDetail {
  timestamp: number;
  cpu?: number;
  memory?: number;
  inputOutput?: number;
}

export interface PulseMetricsResultGroup {
  items: PulseAgentCheckResultDetail[];
}
