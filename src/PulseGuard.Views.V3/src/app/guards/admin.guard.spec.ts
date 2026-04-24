import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

describe('adminGuard', () => {
  let httpTesting: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: '', component: class {} as any },
          { path: 'admin', canActivate: [adminGuard], component: class {} as any },
        ]),
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should allow access for admin users', async () => {
    const resultPromise = firstValueFrom(
      TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any)) as any,
    );

    httpTesting.expectOne('api/1.0/user').flush({ id: 'u1', roles: ['Administrator'] });

    const result = await resultPromise;
    expect(result).toBe(true);
  });

  it('should redirect non-admin users to root', async () => {
    const resultPromise = firstValueFrom(
      TestBed.runInInjectionContext(() => adminGuard({} as any, {} as any)) as any,
    );

    httpTesting.expectOne('api/1.0/user').flush({ id: 'u2', roles: ['Viewer'] });

    const result = await resultPromise;
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });
});
