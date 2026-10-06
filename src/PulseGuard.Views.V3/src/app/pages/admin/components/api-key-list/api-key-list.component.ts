import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminApiKeyEntry } from '../../../../models/admin.model';

@Component({
  selector: 'app-api-key-list',
  standalone: true,
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './api-key-list.component.html',
})
export class ApiKeyListComponent {
  readonly apiKeys = input.required<AdminApiKeyEntry[]>();
  readonly deleteItem = output<AdminApiKeyEntry>();

  expirationDate(apiKey: AdminApiKeyEntry): Date | null {
    if (apiKey.validForDays == null) return null;
    const expiresAt = new Date(apiKey.created).getTime() + apiKey.validForDays * 86_400_000;
    return Number.isFinite(expiresAt) ? new Date(expiresAt) : null;
  }

  isExpired(apiKey: AdminApiKeyEntry): boolean {
    if (apiKey.validForDays == null) return false;
    const expiresAt = this.expirationDate(apiKey)?.getTime();
    return expiresAt !== undefined && Date.now() >= expiresAt;
  }
}
