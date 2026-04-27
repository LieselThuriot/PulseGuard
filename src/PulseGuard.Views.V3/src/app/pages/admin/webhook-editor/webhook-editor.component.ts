import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { Webhook, WebhookType, CredentialOverview } from '../../../models/admin.model';
import { NotificationService } from '../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-webhook-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './webhook-editor.component.html',
  styleUrl: './webhook-editor.component.css',
})
export class WebhookEditorComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isCreate = signal(false);
  readonly backTab = signal('webhooks');
  readonly credentials = signal<CredentialOverview[]>([]);
  readonly webhookTypes = Object.values(WebhookType);

  readonly webhook = signal<Partial<Webhook>>({
    group: '',
    name: '',
    location: '',
    type: WebhookType.All,
    enabled: true,
  });

  private webhookId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminService: AdminService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') ?? 'webhooks';
    this.backTab.set(tab);
    this.adminService.getCredentialIds().subscribe({
      next: (creds) => this.credentials.set(creds),
    });

    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) {
      this.isCreate.set(true);
      this.loading.set(false);
    } else {
      this.webhookId = id;
      this.adminService.getWebhook(id).subscribe({
        next: (data) => {
          this.webhook.set(data);
          this.webhookId = data.id ?? id;
          this.loading.set(false);
        },
        error: () => {
          this.notifications.error('Failed to load webhook.');
          this.loading.set(false);
        },
      });
    }
  }

  save(): void {
    this.saving.set(true);
    const data = this.webhook();

    const op = this.isCreate()
      ? this.adminService.createWebhook(data)
      : this.adminService.updateWebhook(this.webhookId, data);

    op.subscribe({
      next: () => {
        this.notifications.success(this.isCreate() ? 'Webhook created.' : 'Webhook updated.');
        this.router.navigate(['/admin', this.backTab()]);
      },
      error: () => {
        this.notifications.error('Failed to save webhook.');
        this.saving.set(false);
      },
    });
  }

  updateField(field: keyof Webhook, value: any): void {
    this.webhook.update((w) => ({ ...w, [field]: value }));
  }

  selectCredential(id: string): void {
    const cred = id ? this.credentials().find(c => c.id === id) : undefined;
    this.webhook.update(w => ({ ...w, credential: cred }));
  }
}
