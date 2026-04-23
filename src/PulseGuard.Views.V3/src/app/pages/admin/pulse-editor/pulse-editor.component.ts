import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { PulseConfiguration, PulseCheckType, CredentialOverview } from '../../../models/admin.model';
import { NotificationService } from '../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { HeaderEditorComponent } from '../../../components/header-editor/header-editor.component';

@Component({
  selector: 'app-pulse-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent, HeaderEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-editor.component.html',
  styleUrl: './pulse-editor.component.css',
})
export class PulseEditorComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isCreate = signal(false);
  readonly backTab = signal('pulse');
  readonly credentials = signal<CredentialOverview[]>([]);
  readonly pulseCheckTypes = Object.values(PulseCheckType);

  readonly config = signal<Partial<PulseConfiguration>>({
    group: '',
    name: '',
    location: '',
    type: PulseCheckType.HealthApi,
    timeout: 30,
    enabled: true,
    ignoreSslErrors: false,
  });

  private configId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminService: AdminService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') ?? 'pulse';
    this.backTab.set(tab);
    this.adminService.getCredentialIds().subscribe({
      next: (creds) => this.credentials.set(creds),
    });

    const id = this.route.snapshot.queryParamMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (mode === 'create' || !id) {
      this.isCreate.set(true);
      this.loading.set(false);
    } else {
      this.configId = id;
      this.adminService.getPulseConfig(id).subscribe({
        next: (data) => {
          this.config.set(data);
          this.configId = data.sqid ?? id;
          this.loading.set(false);
        },
        error: () => {
          this.notifications.error('Failed to load configuration.');
          this.loading.set(false);
        },
      });
    }
  }

  save(): void {
    this.saving.set(true);
    const data = this.config();
    const id = this.isCreate() ? (data.name ?? '') : this.configId;

    const op = this.isCreate()
      ? this.adminService.createPulseConfig(id, data)
      : this.adminService.updatePulseConfig(id, data);

    op.subscribe({
      next: () => {
        this.notifications.success(this.isCreate() ? 'Configuration created.' : 'Configuration updated.');
        this.router.navigate(['/admin', this.backTab()]);
      },
      error: () => {
        this.notifications.error('Failed to save configuration.');
        this.saving.set(false);
      },
    });
  }

  updateField(field: keyof PulseConfiguration, value: any): void {
    this.config.update((c) => ({ ...c, [field]: value }));
  }
}
