import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.loaded()) {
    // Wait for auth to load — simple retry via redirect
    return router.createUrlTree(['/']);
  }

  return auth.isAdmin() || router.createUrlTree(['/']);
};
