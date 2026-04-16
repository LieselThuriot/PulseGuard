import { PulseStates } from './pulse-states.enum';

export interface PulseOverviewItem {
  state: PulseStates;
  message?: string;
  from?: string;
  to?: string;
}

export interface PulseOverviewGroupItem {
  id: string;
  name: string;
  items: PulseOverviewItem[];
}

export interface PulseOverviewGroup {
  group: string;
  items: PulseOverviewGroupItem[];
}

export interface PulseDetailGroupItem {
  id: string;
  name: string;
  continuationToken?: string;
  items: PulseDetailItem[];
}

export interface PulseDetailItem {
  state: PulseStates;
  message?: string;
  from?: string;
  to?: string;
  error?: string;
}

export interface PulseStateGroupItem {
  id: string;
  name: string;
  items: PulseStateItem[];
}

export interface PulseStateItem {
  state: PulseStates;
  from?: string;
  to?: string;
}

export interface PulseDeployments {
  id: string;
  items: PulseDeployment[];
}

export interface PulseDeployment {
  status: string;
  from: string;
  to?: string;
  author?: string;
  type?: string;
  commitId?: string;
  buildNumber?: string;
}
