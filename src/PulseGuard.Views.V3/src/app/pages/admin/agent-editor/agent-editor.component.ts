import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { PulseAgentConfiguration, AgentCheckType, CredentialOverview } from '../../../models/admin.model';
import { NotificationService } from '../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-agent-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agent-editor.component.html',
  styleUrl: './agent-editor.component.css',
})
export class AgentEditorComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isCreate = signal(false);
  readonly backTab = signal('agents');
  readonly credentials = signal<CredentialOverview[]>([]);
  readonly agentCheckTypes = Object.values(AgentCheckType);

  readonly config = signal<Partial<PulseAgentConfiguration>>({
    group: '',
    name: '',
    location: '',
    type: AgentCheckType.ApplicationInsights,
    isEnabled: true,
  });

  private configId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminService: AdminService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') ?? 'agents';
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
      this.adminService.getAgentConfig(id).subscribe({
        next: (data) => {
          this.config.set(data);
          this.configId = data.sqid ?? id;
          this.loading.set(false);
        },
        error: () => {
          this.notifications.error('Failed to load agent configuration.');
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
      ? this.adminService.createAgentConfig(id, data)
      : this.adminService.updateAgentConfig(id, data);

    op.subscribe({
      next: () => {
        this.notifications.success(this.isCreate() ? 'Agent configuration created.' : 'Agent configuration updated.');
        this.router.navigate(['/admin', this.backTab()]);
      },
      error: () => {
        this.notifications.error('Failed to save agent configuration.');
        this.saving.set(false);
      },
    });
  }

  updateField(field: keyof PulseAgentConfiguration, value: any): void {
    this.config.update((c) => ({ ...c, [field]: value }));
  }
}
