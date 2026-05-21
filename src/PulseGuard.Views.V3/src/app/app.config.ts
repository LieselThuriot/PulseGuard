import { ApplicationConfig, ErrorHandler, provideAppInitializer, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { errorInterceptor } from './interceptors/error.interceptor';
import { ChunkErrorHandler } from './services/chunk-error-handler';
import { VersionCheckService } from './services/version-check.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([errorInterceptor])),
    { provide: ErrorHandler, useClass: ChunkErrorHandler },
    provideAppInitializer(() => {
      inject(VersionCheckService).start();
    }),
  ],
};
