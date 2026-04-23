import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { NotificationService } from '../../../services/notification.service';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { StringListEditorComponent } from '../../../components/string-list-editor/string-list-editor.component';

@Component({
  selector: 'app-user-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, LoadingSpinnerComponent, StringListEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-editor.component.html',
  styleUrl: './user-editor.component.css',
})
export class UserEditorComponent implements OnInit {
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isCreate = signal(false);
  readonly backTab = signal('users');

  readonly userId = signal('');
  readonly nickname = signal('');
  readonly roles = signal<string[]>([]);

  private editId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly adminService: AdminService,
    private readonly notifications: NotificationService,
  ) {}

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab') ?? 'users';
    this.backTab.set(tab);
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) {
      this.isCreate.set(true);
      this.loading.set(false);
    } else {
      this.editId = id;
      this.userId.set(id);
      this.adminService.getUser(id).subscribe({
        next: (user) => {
          this.nickname.set(user.nickname ?? '');
          this.roles.set(user.roles ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    }
  }

  save(): void {
    this.saving.set(true);
    const id = this.isCreate() ? this.userId() : this.editId;
    const data = { nickname: this.nickname(), roles: this.roles() };

    const op = this.isCreate()
      ? this.adminService.createUser(id, data)
      : this.adminService.updateUser(id, data);

    op.subscribe({
      next: () => {
        this.notifications.success(this.isCreate() ? 'User created.' : 'User updated.');
        this.router.navigate(['/admin', this.backTab()]);
      },
      error: () => {
        this.notifications.error('Failed to save user.');
        this.saving.set(false);
      },
    });
  }
}
