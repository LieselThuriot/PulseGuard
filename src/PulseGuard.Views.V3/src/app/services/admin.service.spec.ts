import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  // ---------------------------------------------------------------------------
  // Pulse Configurations
  // ---------------------------------------------------------------------------
  describe('Pulse Configurations', () => {
    it('should GET all pulse configurations', () => {
      service.getPulseConfigurations().subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should GET all generic configurations', () => {
      service.getConfigurations().subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should GET a single pulse config with the encoded ID', () => {
      service.getPulseConfig('my app/test').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my%20app%2Ftest');
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should POST to create a pulse config', () => {
      const config = { url: 'https://example.com' };
      service.createPulseConfig('my-id', config).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my-id');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(config);
      req.flush(null);
    });

    it('should PUT to update a pulse config', () => {
      const config = { url: 'https://updated.com' };
      service.updatePulseConfig('my-id', config).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my-id');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(config);
      req.flush(null);
    });

    it('should DELETE a pulse config', () => {
      service.deletePulseConfig('my-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('deletePulseConfiguration should delegate to deletePulseConfig (same URL and verb)', () => {
      service.deletePulseConfiguration('my-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('togglePulseConfig should PUT with { enabled } in the request body', () => {
      service.togglePulseConfig('my-id', true).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my-id');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ enabled: true });
      req.flush(null);
    });

    it('togglePulseEnabled should append the boolean to the URL with a null body', () => {
      service.togglePulseEnabled('my-id', false).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/pulse/my-id/false');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBeNull();
      req.flush(null);
    });

    it('renameConfig should PUT to the /name endpoint with the provided body', () => {
      service.renameConfig('my-id', { name: 'New Name', group: 'GroupA' }).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/my-id/name');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'New Name', group: 'GroupA' });
      req.flush(null);
    });
  });

  // ---------------------------------------------------------------------------
  // Agent Configurations
  // ---------------------------------------------------------------------------
  describe('Agent Configurations', () => {
    it('should GET all agent configurations', () => {
      service.getAgentConfigurations().subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/agent');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should GET an agent config with both id and type encoded', () => {
      service.getAgentConfig('my app', 'App/Insights').subscribe();
      const req = httpTesting.expectOne(
        'api/1.0/admin/configurations/agent/my%20app/App%2FInsights',
      );
      expect(req.request.method).toBe('GET');
      req.flush({});
    });

    it('should POST to create an agent config', () => {
      const config = { type: 'ApplicationInsights' };
      service.createAgentConfig('my-id', config).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/agent/my-id');
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });

    it('should PUT to update an agent config with encoded id and type', () => {
      service.updateAgentConfig('my-id', 'MyType', {}).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/agent/my-id/MyType');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('deleteAgentConfiguration should delegate to deleteAgentConfig (same URL and verb)', () => {
      service.deleteAgentConfiguration('my-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/configurations/agent/my-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('toggleAgentConfig should include subType and boolean in the URL path with a null body', () => {
      service.toggleAgentConfig('my-id', 'SubType', true).subscribe();
      const req = httpTesting.expectOne(
        'api/1.0/admin/configurations/agent/my-id/SubType/true',
      );
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBeNull();
      req.flush(null);
    });
  });

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------
  describe('Webhooks', () => {
    it('should GET all webhooks', () => {
      service.getWebhooks().subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/webhooks');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should POST to create a webhook (no ID in URL)', () => {
      const webhook = { name: 'My Hook' };
      service.createWebhook(webhook).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/webhooks');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(webhook);
      req.flush(null);
    });

    it('should PUT to update a webhook', () => {
      service.updateWebhook('wh-1', { name: 'Updated' }).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/webhooks/wh-1');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('toggleWebhook should append the boolean to the URL', () => {
      service.toggleWebhook('wh-1', false).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/webhooks/wh-1/false');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('should DELETE a webhook', () => {
      service.deleteWebhook('wh-1').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/webhooks/wh-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------
  describe('Users', () => {
    it('should GET all users', () => {
      service.getUsers().subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/users');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should POST to create a user with the encoded ID', () => {
      const user = { roles: ['Viewer'] };
      service.createUser('user@test.com', user).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/users/user%40test.com');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(user);
      req.flush(null);
    });

    it('should PUT to update a user', () => {
      service.updateUser('user-id', { roles: ['Administrator'] }).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/users/user-id');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('renameUser should PUT to the /name endpoint with { nickname } body', () => {
      service.renameUser('user-id', 'New Name').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/users/user-id/name');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ nickname: 'New Name' });
      req.flush(null);
    });

    it('should DELETE a user', () => {
      service.deleteUser('user-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/users/user-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  // ---------------------------------------------------------------------------
  // Credentials – one representative test per credential type path
  // ---------------------------------------------------------------------------
  describe('Credentials', () => {
    it('should GET credential IDs from the /ids endpoint', () => {
      service.getCredentialIds().subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/ids');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('createOAuth2 should POST to the /oauth2/ path', () => {
      const cred = { clientId: 'id', clientSecret: 'secret', tokenEndpoint: 'url', scopes: [] };
      service.createOAuth2('cred-id', cred).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/oauth2/cred-id');
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });

    it('updateOAuth2 should PUT to the /oauth2/ path', () => {
      const cred = { clientId: 'id', clientSecret: 'secret', tokenEndpoint: 'url', scopes: [] };
      service.updateOAuth2('cred-id', cred).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/oauth2/cred-id');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('deleteOAuth2 should DELETE from the /oauth2/ path', () => {
      service.deleteOAuth2('cred-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/oauth2/cred-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('createBasic should POST to the /basic/ path', () => {
      service.createBasic('cred-id', { username: 'u', password: 'p' }).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/basic/cred-id');
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });

    it('createApiKey should POST to the /apikey/ path', () => {
      service.createApiKey('cred-id', { header: 'X-Key', value: 'val' }).subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/apikey/cred-id');
      expect(req.request.method).toBe('POST');
      req.flush(null);
    });

    it('deleteCredential should use the generic /credentials/ path (not type-specific)', () => {
      service.deleteCredential('cred-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/cred-id');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should encode special characters in credential IDs', () => {
      service.deleteCredential('cred/id with spaces').subscribe();
      const req = httpTesting.expectOne('api/1.0/admin/credentials/cred%2Fid%20with%20spaces');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
