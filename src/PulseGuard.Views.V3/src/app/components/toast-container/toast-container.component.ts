import { Component, ChangeDetectionStrategy } from '@angular/core';
import { NgbToast } from '@ng-bootstrap/ng-bootstrap';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgbToast],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {
  constructor(protected readonly notifications: NotificationService) {}

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'bi-check-circle-fill text-success';
      case 'danger': return 'bi-exclamation-triangle-fill text-danger';
      case 'warning': return 'bi-exclamation-triangle-fill text-warning';
      default: return 'bi-info-circle-fill text-info';
    }
  }

  getTitle(type: string): string {
    switch (type) {
      case 'success': return 'Success';
      case 'danger': return 'Error';
      case 'warning': return 'Warning';
      default: return 'Info';
    }
  }
}
