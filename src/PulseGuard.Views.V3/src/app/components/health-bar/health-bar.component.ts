import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { PulseOverviewItem, PulseOverviewGroupItem, PulseOverviewGroup } from '../../models/pulse-overview.model';
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
  readonly items = input.required<PulseOverviewItem[]>();
  readonly tiny = input(true);

  readonly buckets = computed<HealthBucket[]>(() => {
    const pulses = this.items();
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

      const startStr = start.toLocaleDateString();
      const endStr = end.toLocaleDateString();
      const tooltip = startStr === endStr
        ? `${startStr} ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`
        : `${startStr} ${start.toLocaleTimeString()} - ${endStr} ${end.toLocaleTimeString()}`;

      return { start, end, state, tooltip, cssClass: STATE_CSS_CLASSES[state] };
    });
  });
}
