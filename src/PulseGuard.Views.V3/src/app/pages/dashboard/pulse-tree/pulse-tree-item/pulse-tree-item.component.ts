import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { HealthBarComponent } from '../../../../components/health-bar/health-bar.component';
import { UptimeBadgeComponent } from '../../../../components/uptime-badge/uptime-badge.component';
import { PulseOverviewGroupItem } from '../../../../models/pulse-overview.model';
import { PulseStates, STATE_TEXT_CLASSES } from '../../../../models/pulse-states.enum';
import { computeUptime } from '../../../../utils/uptime.util';

@Component({
  selector: 'app-pulse-tree-item',
  standalone: true,
  imports: [NgClass, NgbTooltip, HealthBarComponent, UptimeBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-tree-item.component.html',
  styleUrl: './pulse-tree-item.component.css',
})
export class PulseTreeItemComponent {
  readonly item = input.required<PulseOverviewGroupItem>();
  readonly selected = input(false);
  readonly overlay = input(false);
  readonly indent = input(false);

  readonly itemSelected = output<PulseOverviewGroupItem>();
  readonly overlayToggled = output<string>();

  readonly state = computed<PulseStates>(() => {
    const items = this.item().items;
    return items?.length > 0 ? items[0].state : PulseStates.Unknown;
  });

  readonly stateClass = computed(() => STATE_TEXT_CLASSES[this.state()]);

  readonly uptime = computed(() => computeUptime(this.item().items));

  select(): void {
    this.itemSelected.emit(this.item());
  }

  toggleOverlay(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.overlayToggled.emit(this.item().id);
  }
}
