import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WebhookEntry } from '../../../../models/admin.model';

type SortColumn = 'group' | 'name' | 'id';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './webhook-list.component.html',
})
export class WebhookListComponent {
  readonly webhooks = input.required<WebhookEntry[]>();
  readonly sortCol = input.required<SortColumn>();
  readonly sortDir = input.required<SortDir>();
  readonly tabName = input.required<string>();

  readonly sortChange = output<SortColumn>();
  readonly toggleChange = output<{ webhook: WebhookEntry; enabled: boolean }>();
  readonly deleteItem = output<string>();

  sortIcon(col: SortColumn): string {
    if (this.sortCol() !== col) return 'bi-chevron-expand';
    return this.sortDir() === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }
}
