import { Component, ChangeDetectionStrategy, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbNav, NgbNavItem, NgbNavContent, NgbNavOutlet, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminService } from '../../services/admin.service';
import { PulseConfiguration, PulseAgentConfiguration, WebhookEntry, UserEntry, CredentialOverview } from '../../models/admin.model';
import { SearchInputComponent } from '../../components/search-input/search-input.component';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, NgbNav, NgbNavItem, NgbNavContent, NgbNavOutlet, SearchInputComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  readonly loading = signal(true);
  readonly activeTab = signal(1);
  readonly searchQuery = signal('');
  readonly showDisabledOnly = signal(false);

  readonly pulseConfigs = signal<PulseConfiguration[]>([]);
  readonly agentConfigs = signal<PulseAgentConfiguration[]>([]);
  readonly webhooks = signal<WebhookEntry[]>([]);
  readonly users = signal<UserEntry[]>([]);
  readonly credentials = signal<CredentialOverview[]>([]);

  readonly filteredPulseConfigs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const disabledOnly = this.showDisabledOnly();
    return this.pulseConfigs().filter((c) => {
      if (disabledOnly && c.isEnabled) return false;
      if (!q) return true;
      return c.group?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  });

  readonly filteredAgentConfigs = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const disabledOnly = this.showDisabledOnly();
    return this.agentConfigs().filter((c) => {
      if (disabledOnly && c.isEnabled) return false;
      if (!q) return true;
      return c.group?.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  });

  readonly filteredWebhooks = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const disabledOnly = this.showDisabledOnly();
    return this.webhooks().filter((w) => {
      if (disabledOnly && w.isEnabled) return false;
      if (!q) return true;
      return w.group?.toLowerCase().includes(q) || w.name.toLowerCase().includes(q);
    });
  });

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.users().filter((u) => {
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    });
  });

  readonly filteredCredentials = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.credentials().filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  });

  constructor(
    private readonly adminService: AdminService,
    private readonly modal: NgbModal,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  toggleDisabledFilter(): void {
    this.showDisabledOnly.update((v) => !v);
  }

  deletePulseConfig(id: string): void {
    const ref = this.modal.open(ConfirmDialogComponent);
    ref.result.then((confirmed) => {
      if (confirmed) {
        this.adminService.deletePulseConfiguration(id).subscribe({
          next: () => {
            this.pulseConfigs.update((list) => list.filter((c) => c.id !== id));
            this.notifications.success('Pulse configuration deleted.');
          },
          error: () => this.notifications.error('Failed to delete pulse configuration.'),
        });
      }
    }).catch(() => {});
  }

  deleteAgentConfig(id: string): void {
    const ref = this.modal.open(ConfirmDialogComponent);
    ref.result.then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteAgentConfiguration(id).subscribe({
          next: () => {
            this.agentConfigs.update((list) => list.filter((c) => c.id !== id));
            this.notifications.success('Agent configuration deleted.');
          },
          error: () => this.notifications.error('Failed to delete agent configuration.'),
        });
      }
    }).catch(() => {});
  }

  deleteWebhook(id: string): void {
    const ref = this.modal.open(ConfirmDialogComponent);
    ref.result.then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteWebhook(id).subscribe({
          next: () => {
            this.webhooks.update((list) => list.filter((w) => w.id !== id));
            this.notifications.success('Webhook deleted.');
          },
          error: () => this.notifications.error('Failed to delete webhook.'),
        });
      }
    }).catch(() => {});
  }

  deleteUser(id: string): void {
    const ref = this.modal.open(ConfirmDialogComponent);
    ref.result.then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteUser(id).subscribe({
          next: () => {
            this.users.update((list) => list.filter((u) => u.id !== id));
            this.notifications.success('User deleted.');
          },
          error: () => this.notifications.error('Failed to delete user.'),
        });
      }
    }).catch(() => {});
  }

  deleteCredential(id: string): void {
    const ref = this.modal.open(ConfirmDialogComponent);
    ref.result.then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteCredential(id).subscribe({
          next: () => {
            this.credentials.update((list) => list.filter((c) => c.id !== id));
            this.notifications.success('Credential deleted.');
          },
          error: () => this.notifications.error('Failed to delete credential.'),
        });
      }
    }).catch(() => {});
  }

  private loadAll(): void {
    this.loading.set(true);
    this.adminService.getPulseConfigurations().subscribe({
      next: (data) => this.pulseConfigs.set(data),
    });
    this.adminService.getAgentConfigurations().subscribe({
      next: (data) => this.agentConfigs.set(data),
    });
    this.adminService.getWebhooks().subscribe({
      next: (data) => this.webhooks.set(data),
    });
    this.adminService.getUsers().subscribe({
      next: (data) => this.users.set(data),
    });
    this.adminService.getCredentialIds().subscribe({
      next: (data) => {
        this.credentials.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
