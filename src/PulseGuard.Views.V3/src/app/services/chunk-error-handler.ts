import { ErrorHandler, Injectable, inject } from '@angular/core';
import { VersionCheckService } from './version-check.service';

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
  private readonly versionCheck = inject(VersionCheckService);

  handleError(error: unknown): void {
    if (this.isChunkLoadError(error)) {
      this.versionCheck.showUpdateModal();
      return;
    }
    console.error(error);
  }

  private isChunkLoadError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    return (
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('error loading dynamically imported module')
    );
  }
}
