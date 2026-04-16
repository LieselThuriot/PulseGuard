import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { tap } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    tap({
      error: (err) => {
        if (err.status === 401) {
          window.location.reload();
        } else if (err.status === 403) {
          notifications.error('You do not have permission to perform this action.');
        } else if (err.status === 0) {
          notifications.error('Unable to connect to the server.');
        } else if (err.status >= 500) {
          notifications.error('A server error occurred. Please try again later.');
        }
      },
    }),
  );
};
