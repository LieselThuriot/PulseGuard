import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-uptime-badge',
  standalone: true,
  imports: [NgbTooltip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './uptime-badge.component.html',
  styleUrl: './uptime-badge.component.css',
})
export class UptimeBadgeComponent {
  readonly percentage = input.required<number>();

  readonly cssClass = computed(() => {
    const pct = this.percentage();
    if (pct >= 95) return 'text-bg-success';
    if (pct >= 80) return 'text-bg-warning';
    return 'text-bg-danger';
  });

  readonly opacity = computed(() => {
    const pct = this.percentage();
    if (pct >= 95) return 0.7 + (pct - 95) * 0.06;
    if (pct >= 80) return 1 - ((pct - 80) / 15) * 0.3;
    return 1 - (pct / 79) * 0.3;
  });

  readonly tooltip = computed(() => `${this.percentage()}% uptime for the last 12 hours`);
}
