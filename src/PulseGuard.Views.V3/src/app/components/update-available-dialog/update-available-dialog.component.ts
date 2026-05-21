import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-update-available-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './update-available-dialog.component.html',
})
export class UpdateAvailableDialogComponent {
  reload(): void {
    window.location.reload();
  }
}
