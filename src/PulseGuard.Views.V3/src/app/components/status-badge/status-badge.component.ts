import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { PulseStates, STATE_CSS_CLASSES } from '../../models/pulse-states.enum';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly state = input.required<PulseStates>();
  readonly cssClass = computed(() => STATE_CSS_CLASSES[this.state()]);
}
