import { Component, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { PulseAgentConfiguration, AgentCheckType, CredentialOverview, PulseEntry, PulseEntryType } from '../../../models/admin.model';
import { NotificationService } from '../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { HeaderEditorComponent } from '../../../components/header-editor/header-editor.component';

@Component({
  selector: 'app-agent-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent, HeaderEditorComponent],
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
  readonly pulseChecks = signal<PulseEntry[]>([]);
  readonly normalPulseChecks = computed(() =>
    this.pulseChecks()
      .filter(c => c.type === PulseEntryType.Normal)
      .sort((a, b) => {
        const aLabel = (a.group ? a.group + ' / ' : '') + a.name;
        const bLabel = (b.group ? b.group + ' / ' : '') + b.name;
        return aLabel.localeCompare(bLabel);
      })
  );
  readonly selectedCheckId = signal('');
  readonly agentCheckTypes = Object.values(AgentCheckType);

  private readonly routeId = signal('');

  readonly editPulseCheckLabel = computed(() => {
    const check = this.pulseChecks().find(c => c.id === this.routeId());
    if (!check) return this.routeId();
    return check.group ? `${check.group} / ${check.name}` : check.name;
  });

  readonly locationLabel = computed(() => {
    switch (this.config().type) {
      case AgentCheckType.LogAnalyticsWorkspace: return 'Workspace ID';
      case AgentCheckType.WebAppDeployment: return 'Resource Group';
      case AgentCheckType.DevOpsDeployment:
      case AgentCheckType.DevOpsRelease: return 'Project';
      default: return 'Location';
    }
  });

  readonly showApplicationName = computed(() =>
    this.config().type !== AgentCheckType.ApplicationInsights
  );
  readonly showSubscriptionId = computed(() =>
    this.config().type === AgentCheckType.WebAppDeployment ||
    this.config().type === AgentCheckType.DevOpsDeployment ||
    this.config().type === AgentCheckType.DevOpsRelease
  );
  readonly showBuildDefinitionId = computed(() =>
    this.config().type === AgentCheckType.DevOpsDeployment
  );
  readonly showStageName = computed(() =>
    this.config().type === AgentCheckType.DevOpsRelease
  );

  readonly config = signal<Partial<PulseAgentConfiguration>>({
    group: '',
    name: '',
    location: '',
    type: AgentCheckType.ApplicationInsights,
    enabled: true,
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
    this.adminService.getConfigurations().subscribe({
      next: (checks) => this.pulseChecks.set(checks),
    });

    const id = this.route.snapshot.queryParamMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    const agentType = this.route.snapshot.queryParamMap.get('agentType') ?? '';

    if (mode === 'create' || !id) {
      this.isCreate.set(true);
      this.loading.set(false);
    } else {
      this.routeId.set(id);
      this.configId = id;
      this.adminService.getAgentConfig(id, agentType).subscribe({
        next: (data) => {
          this.config.set({ ...data, type: agentType as AgentCheckType });
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
    const id = this.isCreate() ? this.selectedCheckId() : this.configId;

    const op = this.isCreate()
      ? this.adminService.createAgentConfig(id, data)
      : this.adminService.updateAgentConfig(id, data.type ?? '', data);

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
    if (field === 'type') {
      // Clear fields that may not apply to the new type
      this.config.update((c) => ({
        ...c,
        applicationName: undefined,
        subscriptionId: undefined,
        buildDefinitionId: undefined,
        stageName: undefined,
      }));
    }
  }

  selectCredential(id: string): void {
    const cred = id ? this.credentials().find(c => c.id === id) : undefined;
    this.config.update(c => ({ ...c, credential: cred }));
  }
}
