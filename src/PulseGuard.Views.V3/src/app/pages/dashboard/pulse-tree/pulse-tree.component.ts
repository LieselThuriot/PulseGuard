import { Component, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap';
import { PulseService } from '../../../services/pulse.service';
import { HealthBarComponent } from '../../../components/health-bar/health-bar.component';
import { UptimeBadgeComponent } from '../../../components/uptime-badge/uptime-badge.component';
import { PulseOverviewGroup, PulseOverviewGroupItem, PulseOverviewItem } from '../../../models/pulse-overview.model';
import { PulseStates, STATE_TEXT_CLASSES } from '../../../models/pulse-states.enum';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-pulse-tree',
  standalone: true,
  imports: [NgbCollapse, HealthBarComponent, UptimeBadgeComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-tree.component.html',
})
export class PulseTreeComponent {
  private readonly collapsedGroups = signal<Set<string>>(new Set());

  protected readonly filteredGroups = computed(() => {
    const groups = this.pulseService.overview();
    if (!this.pulseService.filterUnhealthy()) return groups;

    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((item) => {
          const lastState = this.getLastState(item);
          return lastState !== PulseStates.Healthy;
        }),
      }))
      .filter((g) => g.items.length > 0 || g.group === '');
  });

  constructor(protected readonly pulseService: PulseService) {}

  toggleGroup(groupId: string): void {
    this.collapsedGroups.update((set) => {
      const next = new Set(set);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  isExpanded(groupId: string): boolean {
    return !this.collapsedGroups().has(groupId);
  }

  selectPulse(item: PulseOverviewGroupItem): void {
    this.pulseService.selectPulse(item.id);
  }

  getLastState(item: PulseOverviewGroupItem): PulseStates {
    if (item.items?.length > 0) return item.items[0].state;
    return PulseStates.Unknown;
  }

  getGroupState(group: PulseOverviewGroup): PulseStates {
    const states = new Set(group.items.map((i) => this.getLastState(i)));
    if (states.size === 1) return Array.from(states)[0];
    if (states.size === 0) return PulseStates.Unknown;
    return PulseStates.Degraded;
  }

  getStateIconClass(state: PulseStates): string {
    return STATE_TEXT_CLASSES[state];
  }

  calculateUptime(item: PulseOverviewGroupItem): number {
    const pulses = item.items;
    if (!pulses?.length) return 0;
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    let totalDuration = 0;
    let healthyDuration = 0;

    for (const pulse of pulses) {
      const from = Math.max(new Date(pulse.from!).getTime(), twelveHoursAgo);
      const to = new Date(pulse.to!).getTime();
      const duration = to - from;
      if (duration <= 0) continue;
      totalDuration += duration;
      if (pulse.state === PulseStates.Healthy) healthyDuration += duration;
    }
    return totalDuration > 0 ? (healthyDuration / totalDuration) * 100 : 0;
  }

  getAllPulseItems(group: PulseOverviewGroup): PulseOverviewItem[] {
    return group.items.flatMap((gi) => gi.items);
  }

  isSelected(id: string): boolean {
    return this.pulseService.selectedPulseId() === id;
  }

  isHealthy(item: PulseOverviewGroupItem): boolean {
    return this.getLastState(item) === PulseStates.Healthy;
  }
}
