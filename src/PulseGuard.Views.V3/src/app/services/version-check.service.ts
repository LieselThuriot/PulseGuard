import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UpdateAvailableDialogComponent } from '../components/update-available-dialog/update-available-dialog.component';
import { VERSION_POLL_INTERVAL_MS } from '../constants';

@Injectable({ providedIn: 'root' })
export class VersionCheckService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly modal = inject(NgbModal);

  private currentVersion: string | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private modalOpen = false;

  start(): void {
    this.fetchVersion().then((version) => {
      this.currentVersion = version;
      this.intervalId = setInterval(() => void this.check(), VERSION_POLL_INTERVAL_MS);
    });
  }

  showUpdateModal(): void {
    if (this.modalOpen) {
      return;
    }
    this.modalOpen = true;
    this.modal.open(UpdateAvailableDialogComponent, {
      backdrop: 'static',
      keyboard: false,
      centered: true,
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  private async check(): Promise<void> {
    const version = await this.fetchVersion();
    if (version !== null && version !== this.currentVersion) {
      this.showUpdateModal();
    }
  }

  private fetchVersion(): Promise<string | null> {
    return this.http
      .get<{ version: string }>('version')
      .toPromise()
      .then((response) => response?.version ?? null)
      .catch(() => null);
  }
}
