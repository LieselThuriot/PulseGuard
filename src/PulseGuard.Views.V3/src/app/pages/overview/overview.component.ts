import { Component, ChangeDetectionStrategy, OnInit, DestroyRef, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { PulseService } from '../../services/pulse.service';
import { PulseOverviewGroupItem } from '../../models/pulse-overview.model';
import { PulseStates, STATE_BORDER_VARS } from '../../models/pulse-states.enum';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';

interface OverviewCard {
  id: string;
  name: string;
  state: PulseStates;
  message: string | undefined;
  to: string | undefined;
  isHealthy: boolean;
  borderColor: string;
  cardBackground: string;
  incidentCount: number;
  degradedCount: number;
  uptimePercent: number;
}

interface OverviewSection {
  group: string;
  cards: OverviewCard[];
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterLink, DecimalPipe, StatusBadgeComponent, LoadingSpinnerComponent, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  private readonly pulseService = inject(PulseService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = this.pulseService.loading;

  readonly sections = computed<OverviewSection[]>(() =>
    this.pulseService.overview().map((group) => ({
      group: group.group,
      cards: group.items.map((item) => this.#buildCard(item)),
    })),
  );

  ngOnInit(): void {
    this.pulseService.loadOverview();

    const interval = setInterval(() => this.pulseService.loadOverview(), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  #buildCard(item: PulseOverviewGroupItem): OverviewCard {
    const latest = item.items[0];
    const state = latest?.state ?? PulseStates.Unknown;
    const isHealthy = state === PulseStates.Healthy;

    return {
      id: item.id,
      name: item.name,
      state,
      message: latest?.message,
      to: latest?.to,
      isHealthy,
      borderColor: STATE_BORDER_VARS[state],
      cardBackground: isHealthy ? 'transparent' : `color-mix(in srgb, ${STATE_BORDER_VARS[state]} 6%, transparent)`,
      incidentCount: item.items.filter(
        (i) => i.state === PulseStates.Unhealthy || i.state === PulseStates.TimedOut,
      ).length,
      degradedCount: item.items.filter((i) => i.state === PulseStates.Degraded).length,
      uptimePercent: this.#computeUptime(item),
    };
  }

  #computeUptime(item: PulseOverviewGroupItem): number {
    if (!item.items || item.items.length === 0) return 100;

    const lastItem = item.items[item.items.length - 1];
    const firstItem = item.items[0];

    const earliest = lastItem.from ? new Date(lastItem.from).getTime() : null;
    const latest = firstItem.to ? new Date(firstItem.to).getTime() : null;

    if (!earliest || !latest || latest <= earliest) return 100;

    const totalSpan = latest - earliest;
    let healthyTime = 0;

    for (const measurement of item.items) {
      if (measurement.state === PulseStates.Healthy && measurement.from && measurement.to) {
        healthyTime += new Date(measurement.to).getTime() - new Date(measurement.from).getTime();
      }
    }

    return Math.min(100, (healthyTime / totalSpan) * 100);
  }
}
