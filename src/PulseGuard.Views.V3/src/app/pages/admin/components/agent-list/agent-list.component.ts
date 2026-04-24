import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PulseEntry } from '../../../../models/admin.model';

type SortColumn = 'group' | 'name' | 'id';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agent-list.component.html',
})
export class AgentListComponent {
  readonly configs = input.required<PulseEntry[]>();
  readonly sortCol = input.required<SortColumn>();
  readonly sortDir = input.required<SortDir>();
  readonly tabName = input.required<string>();

  readonly sortChange = output<SortColumn>();
  readonly toggleChange = output<{ config: PulseEntry; enabled: boolean }>();
  readonly renameItem = output<PulseEntry>();
  readonly deleteItem = output<PulseEntry>();

  sortIcon(col: SortColumn): string {
    if (this.sortCol() !== col) return 'bi-chevron-expand';
    return this.sortDir() === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }
}
