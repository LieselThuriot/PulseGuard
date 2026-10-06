import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-api-key-editor',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './api-key-editor.component.html',
})
export class ApiKeyEditorComponent {
  readonly label = signal('');
  readonly expires = signal(true);
  readonly validForDays = signal(90);
  readonly saving = signal(false);
  readonly createdKey = signal<string | null>(null);

  constructor(
    private readonly router: Router,
    private readonly adminService: AdminService,
    private readonly notifications: NotificationService,
  ) {}

  create(): void {
    this.saving.set(true);
    this.adminService.createAdminApiKey({
      label: this.label().trim(),
      validForDays: this.expires() ? this.validForDays() : null,
    }).subscribe({
      next: (result) => {
        this.createdKey.set(result.key);
        this.saving.set(false);
        this.notifications.success('API key created. Copy and store the secret now; it will not be shown again.');
      },
      error: () => {
        this.notifications.error('Failed to create API key.');
        this.saving.set(false);
      },
    });
  }

  async copyKey(): Promise<void> {
    const key = this.createdKey();
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      this.notifications.success('API key copied.');
    } catch {
      this.notifications.error('Could not copy API key. Select and copy it manually.');
    }
  }

  done(): void {
    this.router.navigate(['/admin', 'api-keys']);
  }
}
