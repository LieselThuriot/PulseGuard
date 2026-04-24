import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { NgbCollapse, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { HealthBarComponent } from '../../../../components/health-bar/health-bar.component';
import { PulseTreeItemComponent } from '../pulse-tree-item/pulse-tree-item.component';
import { PulseOverviewGroup, PulseOverviewGroupItem } from '../../../../models/pulse-overview.model';
import { PulseStates, STATE_TEXT_CLASSES } from '../../../../models/pulse-states.enum';

@Component({
  selector: 'app-pulse-tree-group',
  standalone: true,
  imports: [NgClass, NgbCollapse, NgbTooltip, HealthBarComponent, PulseTreeItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-tree-group.component.html',
  styleUrl: './pulse-tree-group.component.css',
})
export class PulseTreeGroupComponent {
  readonly group = input.required<PulseOverviewGroup>();
  readonly expanded = input(false);
  readonly selectedId = input<string | null>(null);
  readonly overlayIds = input<Set<string>>(new Set());

  readonly groupToggled = output<string>();
  readonly itemSelected = output<PulseOverviewGroupItem>();
  readonly overlayToggled = output<string>();

  readonly allPulseItems = computed(() => this.group().items.flatMap(i => i.items));

  readonly groupState = computed<PulseStates>(() => {
    const items = this.group().items;
    if (items.length === 0) return PulseStates.Unknown;
    const states = new Set(items.map(i => this.getLastState(i)));
    if (states.size === 1) return [...states][0];
    return PulseStates.Degraded;
  });

  readonly groupStateClass = computed(() => STATE_TEXT_CLASSES[this.groupState()]);

  private getLastState(item: PulseOverviewGroupItem): PulseStates {
    return item.items?.length > 0 ? item.items[0].state : PulseStates.Unknown;
  }

  toggle(): void {
    this.groupToggled.emit(this.group().group);
  }
}
