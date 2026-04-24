import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should load user on construction', () => {
    const req = httpTesting.expectOne('api/1.0/user');
    expect(req.request.method).toBe('GET');

    req.flush({ id: 'u1', firstname: 'Jane', lastname: 'Doe', roles: ['Administrator'] });

    expect(service.userInfo()).toEqual({ id: 'u1', firstname: 'Jane', lastname: 'Doe', roles: ['Administrator'] });
    expect(service.loaded()).toBe(true);
    expect(service.isAdmin()).toBe(true);
  });

  it('should set isAdmin to false for non-admin users', () => {
    const req = httpTesting.expectOne('api/1.0/user');
    req.flush({ id: 'u2', roles: ['Viewer'] });

    expect(service.isAdmin()).toBe(false);
  });

  it('should compute hasCredentials', () => {
    const req = httpTesting.expectOne('api/1.0/user');
    req.flush({ id: 'u3', roles: ['Credentials'] });

    expect(service.hasCredentials()).toBe(true);
    expect(service.isAdmin()).toBe(false);
  });

  it('should handle API error gracefully', () => {
    const req = httpTesting.expectOne('api/1.0/user');
    req.error(new ProgressEvent('error'), { status: 500 });

    expect(service.userInfo()).toBeNull();
    expect(service.loaded()).toBe(true);
    expect(service.isAdmin()).toBe(false);
  });

  it('should handle 401 error', () => {
    const req = httpTesting.expectOne('api/1.0/user');
    req.error(new ProgressEvent('error'), { status: 401 });

    expect(service.userInfo()).toBeNull();
    expect(service.loaded()).toBe(true);
  });
});
