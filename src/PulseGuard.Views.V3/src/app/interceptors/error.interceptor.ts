import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { tap } from 'rxjs';

const RELOAD_GUARD_KEY = 'pulseguard_401_reload';
const RELOAD_GUARD_WINDOW_MS = 5000;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    tap({
      error: (err) => {
        if (err.status === 401) {
          const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
          if (Date.now() - lastReload > RELOAD_GUARD_WINDOW_MS) {
            sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
            window.location.reload();
          } else {
            notifications.error('Your session has expired. Please refresh the page.');
          }
        } else if (err.status === 403) {
          notifications.error('You do not have permission to perform this action.');
        } else if (err.status === 0) {
          notifications.error('Unable to connect to the server.');
        } else if (err.status >= 400 && err.status < 500) {
          notifications.error(`Request failed (${err.status}). Please check your input and try again.`);
        } else if (err.status >= 500) {
          notifications.error('A server error occurred. Please try again later.');
        }
      },
    }),
  );
};
