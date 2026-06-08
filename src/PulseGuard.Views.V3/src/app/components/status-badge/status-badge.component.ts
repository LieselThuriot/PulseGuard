import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { PulseStates, STATE_CSS_CLASSES, STATE_LABELS } from '../../models/pulse-states.enum';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.css',
})
export class StatusBadgeComponent {
  readonly state   = input.required<PulseStates>();
  readonly variant = input<'solid' | 'subtle'>('solid');

  readonly label    = computed(() => STATE_LABELS[this.state()]);
  readonly cssClass = computed(() =>
    this.variant() === 'solid' ? STATE_CSS_CLASSES[this.state()] : 'subtle-badge',
  );
}
