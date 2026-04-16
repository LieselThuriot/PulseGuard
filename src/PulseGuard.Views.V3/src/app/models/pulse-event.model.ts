import { PulseStates } from './pulse-states.enum';

export interface PulseEventInfo {
  id: string;
  group: string;
  name: string;
  state: PulseStates;
  creation: string;
  elapsedMilliseconds: number;
}
