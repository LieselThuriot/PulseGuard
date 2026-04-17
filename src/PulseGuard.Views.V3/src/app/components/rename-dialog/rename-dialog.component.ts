import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface RenameDialogResult {
  group?: string;
  name: string;
}

@Component({
  selector: 'app-rename-dialog',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rename-dialog.component.html',
})
export class RenameDialogComponent {
  /** Set to true for config rename (shows group field), false for user rename (nickname only) */
  isConfig = true;
  /** Label shown in the modal title, e.g. "Configuration" or "User" */
  label = 'Configuration';

  group = signal('');
  name = signal('');

  constructor(public readonly modal: NgbActiveModal) {}

  save(): void {
    if (!this.name().trim()) return;
    const result: RenameDialogResult = { name: this.name().trim() };
    if (this.isConfig) result.group = this.group().trim();
    this.modal.close(result);
  }
}
