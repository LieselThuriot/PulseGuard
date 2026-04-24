import { Component, ChangeDetectionStrategy, computed, signal, inject, effect } from '@angular/core';
import { NgClass } from '@angular/common';
import { NgbCollapse, NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { Router, ActivatedRoute } from '@angular/router';
import { PulseService } from '../../../services/pulse.service';
import { HealthBarComponent } from '../../../components/health-bar/health-bar.component';
import { UptimeBadgeComponent } from '../../../components/uptime-badge/uptime-badge.component';
import { PulseOverviewGroup, PulseOverviewGroupItem } from '../../../models/pulse-overview.model';
import { PulseStates, STATE_TEXT_CLASSES } from '../../../models/pulse-states.enum';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { TWELVE_HOURS_MS } from '../../../constants';

@Component({
  selector: 'app-pulse-tree',
  standalone: true,
  imports: [NgClass, NgbCollapse, NgbTooltip, HealthBarComponent, UptimeBadgeComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-tree.component.html',
  styleUrl: './pulse-tree.component.css',
})
export class PulseTreeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Empty set = all groups collapsed by default; presence in set = expanded
  private readonly expandedGroups = signal<Set<string>>(new Set());
  private readonly overlayIds = signal<Set<string>>(new Set());

  protected readonly filteredGroups = computed(() => {
    const groups = this.pulseService.overview();
    if (!this.pulseService.filterUnhealthy()) return groups;

    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(item => this.getLastState(item) !== PulseStates.Healthy),
      }))
      .filter(g => g.items.length > 0);
  });

  constructor(protected readonly pulseService: PulseService) {
    // Restore overlays from URL
    const params = this.route.snapshot.queryParamMap;
    const initial = new Set(params.getAll('overlay'));
    if (initial.size) this.overlayIds.set(initial);

    // Auto-expand the group that contains a pulse restored from the URL
    effect(() => {
      const overview = pulseService.overview();
      const selectedId = pulseService.selectedPulseId();
      if (!overview.length || !selectedId) return;

      const groupEntry = overview.find(g => g.group && g.items.some(i => i.id === selectedId));
      if (groupEntry) {
        this.expandedGroups.update(set => {
          if (set.has(groupEntry.group)) return set;
          const next = new Set(set);
          next.add(groupEntry.group);
          return next;
        });
      }
    });
  }

  toggleGroup(groupId: string): void {
    this.expandedGroups.update(set => {
      const next = new Set(set);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  }

  isExpanded(groupId: string): boolean {
    return this.expandedGroups().has(groupId);
  }

  selectPulse(item: PulseOverviewGroupItem): void {
    this.pulseService.selectPulse(item.id);
  }

  isSelected(id: string): boolean {
    return this.pulseService.selectedPulseId() === id;
  }

  getLastState(item: PulseOverviewGroupItem): PulseStates {
    return item.items?.length > 0 ? item.items[0].state : PulseStates.Unknown;
  }

  getGroupState(group: PulseOverviewGroup): PulseStates {
    if (group.items.length === 0) return PulseStates.Unknown;
    const states = new Set(group.items.map(i => this.getLastState(i)));
    if (states.size === 1) return Array.from(states)[0];
    return PulseStates.Degraded;
  }

  getStateClass(state: PulseStates): string {
    return STATE_TEXT_CLASSES[state];
  }

  calculateUptime(item: PulseOverviewGroupItem): number {
    const pulses = item.items;
    if (!pulses?.length) return 0;
    const twelveHoursAgo = Date.now() - TWELVE_HOURS_MS;
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

  toggleOverlay(id: string, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.overlayIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

    // Update query params without changing the current path (which may be /details/:id)
    const urlTree = this.router.parseUrl(this.router.url);
    const overlays = [...this.overlayIds()];
    if (overlays.length) {
      urlTree.queryParams['overlay'] = overlays;
    } else {
      delete urlTree.queryParams['overlay'];
    }
    this.router.navigateByUrl(urlTree, { replaceUrl: true });
  }

  isOverlay(id: string): boolean {
    return this.overlayIds().has(id);
  }

  getAllPulseItems(group: PulseOverviewGroup) {
    return group.items.flatMap(gi => gi.items);
  }
}
