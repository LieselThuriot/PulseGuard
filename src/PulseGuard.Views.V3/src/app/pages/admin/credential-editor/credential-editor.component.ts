import { Component, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { CredentialType, OAuth2CredentialForm, BasicCredentialForm, ApiKeyCredentialForm } from '../../../models/admin.model';
import { NotificationService } from '../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-credential-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './credential-editor.component.html',
  styleUrl: './credential-editor.component.css',
})
export class CredentialEditorComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isCreate = signal(false);
  readonly credentialTypes = Object.values(CredentialType);

  readonly selectedType = signal<CredentialType>(CredentialType.OAuth2);
  readonly credId = signal('');
  readonly oauth2 = signal<Partial<OAuth2CredentialForm>>({ tokenEndpoint: '', clientId: '', clientSecret: '', scopes: '' });
  readonly basic = signal<Partial<BasicCredentialForm>>({ username: '', password: '' });
  readonly apiKey = signal<Partial<ApiKeyCredentialForm>>({ header: '', apiKey: '' });

  private editId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminService: AdminService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    const type = this.route.snapshot.queryParamMap.get('type') as CredentialType;

    if (!id) {
      this.isCreate.set(true);
      this.loading.set(false);
    } else {
      this.editId = id;
      this.credId.set(id);
      if (type) this.selectedType.set(type);
      this.loading.set(false);
    }
  }

  save(): void {
    this.saving.set(true);
    const id = this.isCreate() ? this.credId() : this.editId;
    const type = this.selectedType();

    let op;
    switch (type) {
      case CredentialType.OAuth2:
        const o = { ...this.oauth2(), id } as OAuth2CredentialForm;
        op = this.isCreate() ? this.adminService.createOAuth2(id, o) : this.adminService.updateOAuth2(id, o);
        break;
      case CredentialType.Basic:
        const b = { ...this.basic(), id } as BasicCredentialForm;
        op = this.isCreate() ? this.adminService.createBasic(id, b) : this.adminService.updateBasic(id, b);
        break;
      case CredentialType.ApiKey:
        const a = { ...this.apiKey(), id } as ApiKeyCredentialForm;
        op = this.isCreate() ? this.adminService.createApiKey(id, a) : this.adminService.updateApiKey(id, a);
        break;
    }

    op.subscribe({
      next: () => {
        this.notifications.success(this.isCreate() ? 'Credential created.' : 'Credential updated.');
        this.router.navigate(['/admin']);
      },
      error: () => {
        this.notifications.error('Failed to save credential.');
        this.saving.set(false);
      },
    });
  }

  updateOAuth2Field(field: keyof OAuth2CredentialForm, value: any): void {
    this.oauth2.update((c) => ({ ...c, [field]: value }));
  }

  updateBasicField(field: keyof BasicCredentialForm, value: any): void {
    this.basic.update((c) => ({ ...c, [field]: value }));
  }

  updateApiKeyField(field: keyof ApiKeyCredentialForm, value: any): void {
    this.apiKey.update((c) => ({ ...c, [field]: value }));
  }
}
