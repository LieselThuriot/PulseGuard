import { Component, ChangeDetectionStrategy, signal, OnInit, computed, NgZone, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbNav, NgbNavItem, NgbNavContent, NgbNavOutlet, NgbNavLinkButton, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { PulseEntry, PulseEntryType, WebhookEntry, UserEntry, CredentialEntry } from '../../models/admin.model';
import { SearchInputComponent } from '../../components/search-input/search-input.component';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { RenameDialogComponent } from '../../components/rename-dialog/rename-dialog.component';
import { NotificationService } from '../../services/notification.service';

type SortColumn = 'group' | 'name' | 'id';
type SortDir = 'asc' | 'desc';

const TAB_NAMES: Record<number, string> = { 1: 'pulse', 2: 'agents', 3: 'webhooks', 4: 'users', 5: 'credentials' };
const TAB_IDS: Record<string, number> = { pulse: 1, agents: 2, webhooks: 3, users: 4, credentials: 5 };
const EDITOR_PATHS: Record<number, string> = {
  1: '/admin/pulse-editor', 2: '/admin/agent-editor', 3: '/admin/webhook-editor',
  4: '/admin/user-editor', 5: '/admin/credential-editor',
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, NgbNav, NgbNavItem, NgbNavContent, NgbNavOutlet, NgbNavLinkButton, NgTemplateOutlet, DatePipe, SearchInputComponent, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly activeTab = signal(1);
  readonly searchQuery = signal('');
  readonly showDisabledOnly = signal(false);

  readonly tabName = computed(() => TAB_NAMES[this.activeTab()] ?? 'pulse');
  readonly createEditorPath = computed(() => EDITOR_PATHS[this.activeTab()] ?? '/admin/pulse-editor');
  readonly createEditorParams = computed(() => ({ mode: 'create', tab: this.tabName() }));

  readonly sortCol = signal<SortColumn>('group');
  readonly sortDir = signal<SortDir>('asc');

  readonly pulseConfigs = signal<PulseEntry[]>([]);
  readonly agentConfigs = signal<PulseEntry[]>([]);
  readonly webhooks = signal<WebhookEntry[]>([]);
  readonly users = signal<UserEntry[]>([]);
  readonly credentials = signal<CredentialEntry[]>([]);

  private sortByGroupName<T extends { group?: string; name: string }>(list: T[]): T[] {
    const col = this.sortCol();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const ag = (a.group ?? '').toLowerCase();
      const bg = (b.group ?? '').toLowerCase();
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      if (col === 'group') {
        const c = ag.localeCompare(bg); return c !== 0 ? c * dir : an.localeCompare(bn);
      }
      const c = an.localeCompare(bn); return c !== 0 ? c * dir : ag.localeCompare(bg);
    });
  }

  private filterEnabled<T extends { group?: string; name: string; enabled?: boolean }>(list: T[]): T[] {
    const q = this.searchQuery().toLowerCase();
    const disabledOnly = this.showDisabledOnly();
    return list.filter((c) => {
      if (disabledOnly && c.enabled) return false;
      if (!q) return true;
      return (c.group ?? '').toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  }

  readonly filteredPulseConfigs = computed(() => this.sortByGroupName(this.filterEnabled(this.pulseConfigs())));

  readonly filteredAgentConfigs = computed(() => this.sortByGroupName(this.filterEnabled(this.agentConfigs())));

  readonly filteredWebhooks = computed(() => this.sortByGroupName(this.filterEnabled(this.webhooks())));

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.users().filter((u) => {
      if (!q) return true;
      return u.id.toLowerCase().includes(q) || (u.nickname ?? '').toLowerCase().includes(q);
    });
    return [...list]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((u) => ({ ...u, daysAgo: this.#computeDaysAgo(u.lastVisited) }));
  });

  readonly filteredCredentials = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.credentials().filter((c) => {
      if (!q) return true;
      return c.id.toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => a.id.localeCompare(b.id));
  });

  private readonly authService = inject(AuthService);
  readonly hasCredentials = this.authService.hasCredentials;

  constructor(
    private readonly adminService: AdminService,
    private readonly modal: NgbModal,
    private readonly notifications: NotificationService,
    private readonly zone: NgZone,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const tab = params.get('tab') ?? 'pulse';
      this.activeTab.set(TAB_IDS[tab] ?? 1);
    });
    this.loadAll();
  }

  onTabChange(id: number): void {
    this.router.navigate(['/admin', TAB_NAMES[id] ?? 'pulse']);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  #computeDaysAgo(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return ' ( Today )';
    if (days === 1) return ' ( Yesterday )';
    return ` ( ${days} days ago )`;
  }

  toggleDisabledFilter(): void {
    this.showDisabledOnly.update((v) => !v);
  }

  sort(col: SortColumn): void {
    if (this.sortCol() === col) {
      this.sortDir.update((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortCol.set(col);
      this.sortDir.set('asc');
    }
  }

  sortIcon(col: SortColumn): string {
    if (this.sortCol() !== col) return 'bi-chevron-expand';
    return this.sortDir() === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down';
  }

  // ── Enable toggles ──────────────────────────────────────────────────────────

  togglePulse(config: PulseEntry, enabled: boolean): void {
    this.adminService.togglePulseEnabled(config.id, enabled).subscribe({
      next: () => this.pulseConfigs.update((list) => list.map((c) => c.id === config.id ? { ...c, enabled } : c)),
      error: () => this.notifications.error('Failed to update pulse check.'),
    });
  }

  toggleAgent(config: PulseEntry, enabled: boolean): void {
    this.adminService.toggleAgentConfig(config.id, config.subType, enabled).subscribe({
      next: () => this.agentConfigs.update((list) => list.map((c) => c.id === config.id ? { ...c, enabled } : c)),
      error: () => this.notifications.error('Failed to update agent check.'),
    });
  }

  toggleWebhook(webhook: WebhookEntry, enabled: boolean): void {
    this.adminService.toggleWebhook(webhook.id, enabled).subscribe({
      next: () => this.webhooks.update((list) => list.map((w) => w.id === webhook.id ? { ...w, enabled } : w)),
      error: () => this.notifications.error('Failed to update webhook.'),
    });
  }

  // ── Rename ──────────────────────────────────────────────────────────────────

  renameConfig(config: PulseEntry): void {
    const ref = this.modal.open(RenameDialogComponent);
    ref.componentInstance.isConfig = true;
    ref.componentInstance.label = config.type === PulseEntryType.Normal ? 'Pulse Check' : 'Agent Check';
    ref.componentInstance.group.set(config.group ?? '');
    ref.componentInstance.name.set(config.name);
    ref.result.then((result) => this.zone.run(() => {
      this.adminService.renameConfig(config.id, result).subscribe({
        next: () => {
          const update = (list: PulseEntry[]) =>
            list.map((c) => c.id === config.id ? { ...c, group: result.group ?? c.group, name: result.name } : c);
          if (config.type === PulseEntryType.Normal) {
            this.pulseConfigs.update(update);
          } else {
            this.agentConfigs.update(update);
          }
          this.notifications.success('Renamed successfully.');
        },
        error: () => this.notifications.error('Failed to rename.'),
      });
    })).catch(() => {});
  }

  renameUser(user: UserEntry): void {
    const ref = this.modal.open(RenameDialogComponent);
    ref.componentInstance.isConfig = false;
    ref.componentInstance.label = 'User';
    ref.componentInstance.name.set(user.nickname ?? '');
    ref.result.then((result) => this.zone.run(() => {
      this.adminService.renameUser(user.id, result.name).subscribe({
        next: () => {
          this.users.update((list) => list.map((u) => u.id === user.id ? { ...u, nickname: result.name } : u));
          this.notifications.success('User renamed successfully.');
        },
        error: () => this.notifications.error('Failed to rename user.'),
      });
    })).catch(() => {});
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

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

  deleteAgentConfig(config: PulseEntry): void {
    const ref = this.modal.open(ConfirmDialogComponent);
    ref.result.then((confirmed) => {
      if (confirmed) {
        this.adminService.deleteAgentConfig(config.id).subscribe({
          next: () => {
            this.agentConfigs.update((list) => list.filter((c) => c.id !== config.id));
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
            this.credentials.update((list) => list.filter((c: CredentialEntry) => c.id !== id));
            this.notifications.success('Credential deleted.');
          },
          error: () => this.notifications.error('Failed to delete credential.'),
        });
      }
    }).catch(() => {});
  }

  private loadAll(): void {
    this.loading.set(true);
    this.adminService.getConfigurations().subscribe({
      next: (data) => {
        this.pulseConfigs.set(data.filter((c) => c.type === PulseEntryType.Normal));
        this.agentConfigs.set(data.filter((c) => c.type === PulseEntryType.Agent));
      },
    });
    this.adminService.getWebhooks().subscribe({
      next: (data) => this.webhooks.set(data),
    });
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        if (!this.hasCredentials()) this.loading.set(false);
      },
    });
    if (this.hasCredentials()) {
      this.adminService.getCredentials().subscribe({
        next: (data) => {
          this.credentials.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }
}
