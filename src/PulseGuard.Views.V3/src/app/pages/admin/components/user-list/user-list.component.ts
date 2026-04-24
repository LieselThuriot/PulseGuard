import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserEntry } from '../../../../models/admin.model';

export type UserEntryWithDaysAgo = UserEntry & { daysAgo: string };

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-list.component.html',
})
export class UserListComponent {
  readonly users = input.required<UserEntryWithDaysAgo[]>();
  readonly tabName = input.required<string>();

  readonly renameItem = output<UserEntry>();
  readonly deleteItem = output<string>();
}
