import {
  Component, ChangeDetectionStrategy, input, computed,
  ElementRef, ViewChild, AfterViewInit, effect, OnDestroy
} from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { PulseHeatmaps, PulseHeatmap } from '../../../../models/pulse-heatmap.model';
import { PulseDeployment } from '../../../../models/pulse-overview.model';

interface HeatmapCell {
  dayKey: string;
  state: string;
  color: string;
  tooltip: string;
  hasDeployment: boolean;
}

interface HeatmapWeek {
  cells: (HeatmapCell | null)[];
}

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [NgbTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.css',
})
export class HeatmapComponent {
  readonly data = input.required<PulseHeatmaps>();
  readonly deployments = input<PulseDeployment[]>([]);

  readonly weeks = computed<HeatmapWeek[]>(() => {
    const heatmapData = this.data();
    const deploys = this.deployments();

    const deploymentsByDay = new Map<string, number>();
    for (const d of deploys) {
      const date = new Date(d.from);
      date.setUTCHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      deploymentsByDay.set(key, (deploymentsByDay.get(key) ?? 0) + 1);
    }

    const dayLookup = new Map<string, PulseHeatmap>();
    if (heatmapData?.items) {
      for (const item of heatmapData.items) {
        const key = this.apiDayToKey(item.day);
        dayLookup.set(key, item);
      }
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayOfWeek = today.getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const lastMonday = new Date(today);
    lastMonday.setUTCDate(today.getUTCDate() - daysSinceMonday);
    const startDate = new Date(lastMonday);
    startDate.setUTCDate(lastMonday.getUTCDate() - 7 * 52);

    const weeks: HeatmapWeek[] = [];
    const current = new Date(startDate);

    while (current <= today) {
      const week: (HeatmapCell | null)[] = [];
      for (let d = 0; d < 7; d++) {
        if (current > today) {
          week.push(null);
        } else {
          const dayKey = current.toISOString().slice(0, 10);
          const entry = dayLookup.get(dayKey);
          const hasDeploy = deploymentsByDay.has(dayKey);
          week.push(this.buildCell(dayKey, entry, hasDeploy));
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
      weeks.push({ cells: week });
    }

    return weeks;
  });

  private apiDayToKey(apiDay: string): string {
    return `${apiDay.slice(0, 4)}-${apiDay.slice(4, 6)}-${apiDay.slice(6, 8)}`;
  }

  private buildCell(dayKey: string, entry: PulseHeatmap | undefined, hasDeploy: boolean): HeatmapCell {
    if (!entry) {
      return { dayKey, state: 'Unknown', color: 'var(--bs-secondary-bg)', tooltip: dayKey, hasDeployment: hasDeploy };
    }

    const total = entry.healthy + entry.degraded + entry.unhealthy + entry.timedOut + entry.unknown;
    if (total === 0) {
      return { dayKey, state: 'Unknown', color: 'var(--bs-secondary-bg)', tooltip: dayKey, hasDeployment: hasDeploy };
    }

    let state = 'Healthy';
    let color = '#198754';
    if (entry.unhealthy > 0) {
      state = 'Unhealthy';
      const intensity = Math.min(1, entry.unhealthy / total + 0.3);
      color = `rgba(220, 53, 69, ${intensity})`;
    } else if (entry.timedOut > 0) {
      state = 'TimedOut';
      const intensity = Math.min(1, entry.timedOut / total + 0.3);
      color = `rgba(214, 51, 132, ${intensity})`;
    } else if (entry.degraded > 0) {
      state = 'Degraded';
      const intensity = Math.min(1, entry.degraded / total + 0.3);
      color = `rgba(255, 193, 7, ${intensity})`;
    } else {
      const intensity = Math.min(1, entry.healthy / total);
      color = `rgba(25, 135, 84, ${intensity})`;
    }

    const tooltip = `${dayKey}\nH: ${entry.healthy} D: ${entry.degraded} U: ${entry.unhealthy} T: ${entry.timedOut}`;
    return { dayKey, state, color, tooltip, hasDeployment: hasDeploy };
  }
}
