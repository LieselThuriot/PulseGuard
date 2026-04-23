export enum PulseCheckType {
  HealthApi = 'HealthApi',
  StatusCode = 'StatusCode',
  Json = 'Json',
  Contains = 'Contains',
  HealthCheck = 'HealthCheck',
  StatusApi = 'StatusApi',
}

export enum AgentCheckType {
  ApplicationInsights = 'ApplicationInsights',
  LogAnalyticsWorkspace = 'LogAnalyticsWorkspace',
  WebAppDeployment = 'WebAppDeployment',
  DevOpsDeployment = 'DevOpsDeployment',
  DevOpsRelease = 'DevOpsRelease',
}

export enum WebhookType {
  All = 'All',
  StateChange = 'StateChange',
  ThresholdBreach = 'ThresholdBreach',
}

export enum CredentialType {
  OAuth2 = 'OAuth2',
  Basic = 'Basic',
  ApiKey = 'ApiKey',
}

export enum PulseEntryType {
  Normal = 'Normal',
  Agent = 'Agent',
}

export interface PulseEntry {
  id: string;
  type: PulseEntryType;
  subType: string;
  group: string;
  name: string;
  enabled: boolean;
}

export interface PulseConfiguration {
  id: string;
  group: string;
  name: string;
  location: string;
  type: PulseCheckType;
  timeout: number;
  degrationTimeout?: number;
  enabled: boolean;
  ignoreSslErrors: boolean;
  sqid: string;
  comparisonValue?: string;
  headers?: Record<string, string>;
  authenticationId?: string;
}

export interface PulseAgentConfiguration {
  id: string;
  group: string;
  name: string;
  sqid: string;
  type: AgentCheckType;
  location: string;
  applicationName?: string;
  subscriptionId?: string;
  buildDefinitionId?: number;
  stageName?: string;
  enabled: boolean;
  headers?: Record<string, string>;
  authenticationId?: string;
}

export interface WebhookEntry {
  id: string;
  type: WebhookType;
  group: string;
  name: string;
  location: string;
  enabled: boolean;
  credential?: CredentialOverview;
}

export interface Webhook {
  id: string;
  secret?: string;
  group: string;
  name: string;
  location: string;
  isEnabled: boolean;
  type: WebhookType;
  authenticationId?: string;
}

export interface UserEntry {
  id: string;
  name: string;
  email?: string;
  role: string;
  nickname?: string;
  roles: string[];
  lastVisited?: string;
}

export interface CredentialOverview {
  type: CredentialType;
  id: string;
  name: string;
}

export interface ApiKeyCredentialEntry {
  $type: 'ApiKey';
  id: string;
  header: string;
}

export interface BasicCredentialEntry {
  $type: 'Basic';
  id: string;
  username?: string;
}

export interface OAuth2CredentialEntry {
  $type: 'OAuth2';
  id: string;
  tokenEndpoint: string;
  clientId: string;
  scopes?: string;
}

export type CredentialEntry =
  | ApiKeyCredentialEntry
  | BasicCredentialEntry
  | OAuth2CredentialEntry;

export interface OAuth2CredentialForm {
  id: string;
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  scopes?: string;
}

export interface BasicCredentialForm {
  id: string;
  username?: string;
  password: string;
}

export interface ApiKeyCredentialForm {
  id: string;
  header: string;
  apiKey: string;
}
