import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CredentialEntry } from '../../../../models/admin.model';

@Component({
  selector: 'app-credential-list',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-list.component.html',
})
export class CredentialListComponent {
  readonly credentials = input.required<CredentialEntry[]>();
  readonly tabName = input.required<string>();

  readonly deleteItem = output<string>();
}
