import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  readonly title = input('Confirm Delete');
  readonly message = input('Are you sure you want to delete this item? This action cannot be undone.');

  constructor(public readonly modal: NgbActiveModal) {}
}
