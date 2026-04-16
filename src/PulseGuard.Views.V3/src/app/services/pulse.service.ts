import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PulseOverviewGroup } from '../models/pulse-overview.model';

@Injectable({ providedIn: 'root' })
export class PulseService {
  readonly overview = signal<PulseOverviewGroup[]>([]);
  readonly selectedPulseId = signal<string | null>(null);
  readonly filterUnhealthy = signal(false);
  readonly loading = signal(false);

  constructor(private readonly http: HttpClient) {}

  loadOverview(): void {
    this.loading.set(true);
    this.http.get<PulseOverviewGroup[]>('api/1.0/pulses').subscribe({
      next: (data) => {
        data.sort((a, b) => {
          if (a.group === '') return 1;
          if (b.group === '') return -1;
          return a.group.localeCompare(b.group);
        });
        data.forEach((g) => g.items.sort((a, b) => a.name.localeCompare(b.name)));
        this.overview.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectPulse(id: string): void {
    this.selectedPulseId.set(id);
  }

  toggleFilter(): void {
    this.filterUnhealthy.update((v) => !v);
  }
}
