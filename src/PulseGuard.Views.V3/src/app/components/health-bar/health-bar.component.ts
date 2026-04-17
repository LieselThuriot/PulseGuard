import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { PulseOverviewItem } from '../../models/pulse-overview.model';
import { PulseCheckResultDetail } from '../../models/pulse-detail.model';
import { PulseStates, STATE_CSS_CLASSES } from '../../models/pulse-states.enum';

interface HealthBucket {
  start: Date;
  end: Date;
  state: PulseStates;
  tooltip: string;
  cssClass: string;
}

@Component({
  selector: 'app-health-bar',
  standalone: true,
  imports: [NgbTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './health-bar.component.html',
  styleUrl: './health-bar.component.css',
})
export class HealthBarComponent {
  /** Overview items (PulseOverviewItem[]) — use for tree / tiny health bars */
  readonly items = input<PulseOverviewItem[]>([]);
  /** Detail items (PulseCheckResultDetail[]) — use for full detail health bar */
  readonly detailItems = input<PulseCheckResultDetail[] | null>(null);
  readonly tiny = input(true);

  readonly buckets = computed<HealthBucket[]>(() => {
    const detail = this.detailItems();
    if (detail !== null) {
      return this.buildDetailBuckets(detail);
    }
    return this.buildOverviewBuckets(this.items());
  });

  private buildOverviewBuckets(pulses: PulseOverviewItem[]): HealthBucket[] {
    const totalHours = 12;
    const bucketCount = 10;
    const bucketSize = totalHours / bucketCount;
    const now = Date.now() + 60000;

    const healthStates: PulseStates[] = [
      PulseStates.Healthy,
      PulseStates.Degraded,
      PulseStates.Unhealthy,
      PulseStates.TimedOut,
    ];

    return Array.from({ length: bucketCount }, (_, i) => {
      const start = new Date(now - (totalHours - i * bucketSize) * 60 * 60 * 1000);
      const end = new Date(now - (totalHours - (i + 1) * bucketSize) * 60 * 60 * 1000);
      let state = PulseStates.Unknown;

      for (const pulse of pulses) {
        const from = new Date(pulse.from!);
        const to = new Date(pulse.to!);
        if (from <= end && to >= start) {
          const worstIdx = Math.max(healthStates.indexOf(pulse.state), healthStates.indexOf(state));
          if (worstIdx !== -1) state = healthStates[worstIdx];
        }
      }

      const tooltip = this.formatTooltip(start, end);
      return { start, end, state, tooltip, cssClass: STATE_CSS_CLASSES[state] };
    });
  }

  private buildDetailBuckets(items: PulseCheckResultDetail[]): HealthBucket[] {
    if (!items.length) return [];

    const bucketCount = 144;
    const healthStates: PulseStates[] = [
      PulseStates.Healthy,
      PulseStates.Degraded,
      PulseStates.Unhealthy,
      PulseStates.TimedOut,
    ];

    const minTs = items[0].timestamp;
    const maxTs = items[items.length - 1].timestamp + 1;
    const span = maxTs - minTs || 1;
    const bucketMs = span / bucketCount;

    return Array.from({ length: bucketCount }, (_, i) => {
      const start = new Date(minTs + i * bucketMs);
      const end = new Date(minTs + (i + 1) * bucketMs);
      let state = PulseStates.Unknown;

      for (const item of items) {
        if (item.timestamp >= start.getTime() && item.timestamp < end.getTime()) {
          const worstIdx = Math.max(healthStates.indexOf(item.state), healthStates.indexOf(state));
          if (worstIdx !== -1) state = healthStates[worstIdx];
        }
      }

      const tooltip = this.formatTooltip(start, end);
      return { start, end, state, tooltip, cssClass: STATE_CSS_CLASSES[state] };
    });
  }

  private formatTooltip(start: Date, end: Date): string {
    const startDate = start.toLocaleDateString();
    const endDate = end.toLocaleDateString();
    return startDate === endDate
      ? `${startDate} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`
      : `${startDate} ${start.toLocaleTimeString()} - ${endDate} ${end.toLocaleTimeString()}`;
  }
}
