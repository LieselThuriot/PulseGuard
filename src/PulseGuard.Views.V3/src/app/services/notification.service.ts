import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  autohide?: boolean;
  delay?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'info', delay = 5000): void {
    const toast: Toast = { id: this.nextId++, message, type, autohide: true, delay };
    this.toasts.update((t) => [...t, toast]);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'danger', 8000);
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  remove(id: number): void {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }
}
