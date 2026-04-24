import { Component, ChangeDetectionStrategy, computed, signal, inject, effect } from '@angular/core';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { Router, ActivatedRoute } from '@angular/router';
import { PulseService } from '../../../services/pulse.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { PulseTreeItemComponent } from './pulse-tree-item/pulse-tree-item.component';
import { PulseTreeGroupComponent } from './pulse-tree-group/pulse-tree-group.component';
import { PulseOverviewGroupItem } from '../../../models/pulse-overview.model';
import { PulseStates } from '../../../models/pulse-states.enum';

@Component({
  selector: 'app-pulse-tree',
  standalone: true,
  imports: [NgbTooltip, LoadingSpinnerComponent, PulseTreeItemComponent, PulseTreeGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-tree.component.html',
  styleUrl: './pulse-tree.component.css',
})
export class PulseTreeComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Empty set = all groups collapsed by default; presence in set = expanded
  private readonly expandedGroups = signal<Set<string>>(new Set());
  protected readonly overlayIds = signal<Set<string>>(new Set());

  protected readonly filteredGroups = computed(() => {
    const groups = this.pulseService.overview();
    if (!this.pulseService.filterUnhealthy()) return groups;

    return groups
      .map(g => ({
        ...g,
        items: g.items.filter(item => {
          const state = item.items?.length > 0 ? item.items[0].state : PulseStates.Unknown;
          return state !== PulseStates.Healthy;
        }),
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

  toggleOverlay(id: string): void {
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

  readonly overlayCount = computed(() => this.overlayIds().size);

  clearOverlays(): void {
    this.overlayIds.set(new Set());
    const urlTree = this.router.parseUrl(this.router.url);
    delete urlTree.queryParams['overlay'];
    this.router.navigateByUrl(urlTree, { replaceUrl: true });
  }

}
