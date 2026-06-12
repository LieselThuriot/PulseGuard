import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserEntry } from '../../../../models/admin.model';
import { TimeAgoPipe } from '../../../../pipes/time-ago.pipe';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [RouterLink, DatePipe, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  readonly users = input.required<UserEntry[]>();
  readonly tabName = input.required<string>();

  readonly renameItem = output<UserEntry>();
  readonly deleteItem = output<string>();

  getActivityClass(lastVisited: string): string {
    const days = Math.floor((Date.now() - new Date(lastVisited).getTime()) / 86_400_000);
    if (days < 7) return 'badge text-bg-success';
    if (days < 30) return 'badge text-bg-warning';
    return 'badge text-bg-danger';
  }
}
