import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PulseEntry, PulseConfiguration, PulseAgentConfiguration,
  WebhookEntry, Webhook, UserEntry, CredentialEntry, CredentialOverview,
  OAuth2CredentialForm, BasicCredentialForm, ApiKeyCredentialForm,
} from '../models/admin.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly http: HttpClient) {}

  // Configurations
  getPulseConfigurations(): Observable<PulseConfiguration[]> {
    return this.http.get<PulseConfiguration[]>('api/1.0/admin/configurations/pulse');
  }

  getAgentConfigurations(): Observable<PulseAgentConfiguration[]> {
    return this.http.get<PulseAgentConfiguration[]>('api/1.0/admin/configurations/agent');
  }

  getConfigurations(): Observable<PulseEntry[]> {
    return this.http.get<PulseEntry[]>('api/1.0/admin/configurations');
  }

  getPulseConfig(id: string): Observable<PulseConfiguration> {
    return this.http.get<PulseConfiguration>(`api/1.0/admin/configurations/pulse/${encodeURIComponent(id)}`);
  }

  createPulseConfig(id: string, config: Partial<PulseConfiguration>): Observable<void> {
    return this.http.post<void>(`api/1.0/admin/configurations/pulse/${encodeURIComponent(id)}`, config);
  }

  updatePulseConfig(id: string, config: Partial<PulseConfiguration>): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/configurations/pulse/${encodeURIComponent(id)}`, config);
  }

  deletePulseConfig(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/configurations/pulse/${encodeURIComponent(id)}`);
  }

  deletePulseConfiguration(id: string): Observable<void> {
    return this.deletePulseConfig(id);
  }

  togglePulseConfig(id: string, enabled: boolean): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/configurations/pulse/${encodeURIComponent(id)}`, { enabled });
  }

  getAgentConfig(id: string): Observable<PulseAgentConfiguration> {
    return this.http.get<PulseAgentConfiguration>(`api/1.0/admin/configurations/agent/${encodeURIComponent(id)}`);
  }

  createAgentConfig(id: string, config: Partial<PulseAgentConfiguration>): Observable<void> {
    return this.http.post<void>(`api/1.0/admin/configurations/agent/${encodeURIComponent(id)}`, config);
  }

  updateAgentConfig(id: string, config: Partial<PulseAgentConfiguration>): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/configurations/agent/${encodeURIComponent(id)}`, config);
  }

  deleteAgentConfig(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/configurations/agent/${encodeURIComponent(id)}`);
  }

  deleteAgentConfiguration(id: string): Observable<void> {
    return this.deleteAgentConfig(id);
  }

  toggleAgentConfig(id: string, subType: string, enabled: boolean): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/configurations/agent/${encodeURIComponent(id)}/${encodeURIComponent(subType)}/${enabled}`, null);
  }

  togglePulseEnabled(id: string, enabled: boolean): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/configurations/pulse/${encodeURIComponent(id)}/${enabled}`, null);
  }

  renameConfig(id: string, body: { name?: string; group?: string }): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/configurations/${encodeURIComponent(id)}/name`, body);
  }

  // Webhooks
  getWebhooks(): Observable<WebhookEntry[]> {
    return this.http.get<WebhookEntry[]>('api/1.0/admin/webhooks');
  }

  getWebhook(id: string): Observable<Webhook> {
    return this.http.get<Webhook>(`api/1.0/admin/webhooks/${encodeURIComponent(id)}`);
  }

  createWebhook(webhook: Partial<Webhook>): Observable<void> {
    return this.http.post<void>('api/1.0/admin/webhooks', webhook);
  }

  updateWebhook(id: string, webhook: Partial<Webhook>): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/webhooks/${encodeURIComponent(id)}`, webhook);
  }

  toggleWebhook(id: string, enabled: boolean): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/webhooks/${encodeURIComponent(id)}/${enabled}`, null);
  }

  deleteWebhook(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/webhooks/${encodeURIComponent(id)}`);
  }

  // Users
  getUsers(): Observable<UserEntry[]> {
    return this.http.get<UserEntry[]>('api/1.0/admin/users');
  }

  getUser(id: string): Observable<UserEntry> {
    return this.http.get<UserEntry>(`api/1.0/admin/users/${encodeURIComponent(id)}`);
  }

  createUser(id: string, user: { nickname?: string; roles: string[] }): Observable<void> {
    return this.http.post<void>(`api/1.0/admin/users/${encodeURIComponent(id)}`, user);
  }

  updateUser(id: string, user: { nickname?: string; roles: string[] }): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/users/${encodeURIComponent(id)}`, user);
  }

  renameUser(id: string, nickname: string): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/users/${encodeURIComponent(id)}/name`, { nickname });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/users/${encodeURIComponent(id)}`);
  }

  // Credentials
  getCredentialIds(): Observable<CredentialOverview[]> {
    return this.http.get<CredentialOverview[]>('api/1.0/admin/credentials/ids');
  }

  getCredentials(): Observable<CredentialEntry[]> {
    return this.http.get<CredentialEntry[]>('api/1.0/admin/credentials');
  }

  createOAuth2(id: string, cred: OAuth2CredentialForm): Observable<void> {
    return this.http.post<void>(`api/1.0/admin/credentials/oauth2/${encodeURIComponent(id)}`, cred);
  }

  updateOAuth2(id: string, cred: OAuth2CredentialForm): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/credentials/oauth2/${encodeURIComponent(id)}`, cred);
  }

  deleteOAuth2(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/credentials/oauth2/${encodeURIComponent(id)}`);
  }

  createBasic(id: string, cred: BasicCredentialForm): Observable<void> {
    return this.http.post<void>(`api/1.0/admin/credentials/basic/${encodeURIComponent(id)}`, cred);
  }

  updateBasic(id: string, cred: BasicCredentialForm): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/credentials/basic/${encodeURIComponent(id)}`, cred);
  }

  deleteBasic(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/credentials/basic/${encodeURIComponent(id)}`);
  }

  createApiKey(id: string, cred: ApiKeyCredentialForm): Observable<void> {
    return this.http.post<void>(`api/1.0/admin/credentials/apikey/${encodeURIComponent(id)}`, cred);
  }

  updateApiKey(id: string, cred: ApiKeyCredentialForm): Observable<void> {
    return this.http.put<void>(`api/1.0/admin/credentials/apikey/${encodeURIComponent(id)}`, cred);
  }

  deleteApiKey(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/credentials/apikey/${encodeURIComponent(id)}`);
  }

  deleteCredential(id: string): Observable<void> {
    return this.http.delete<void>(`api/1.0/admin/credentials/${encodeURIComponent(id)}`);
  }
}
