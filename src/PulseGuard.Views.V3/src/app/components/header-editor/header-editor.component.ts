import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface HeaderRow { key: string; value: string; }

@Component({
  selector: 'app-header-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header-editor.component.html',
})
export class HeaderEditorComponent {
  readonly value = input<Record<string, string> | undefined>();
  readonly valueChange = output<Record<string, string> | undefined>();

  readonly rows = signal<HeaderRow[]>([]);

  constructor() {
    effect(() => {
      const v = this.value();
      if (v && typeof v === 'object') {
        this.rows.set(Object.entries(v).map(([key, value]) => ({ key, value: String(value) })));
      } else {
        this.rows.set([]);
      }
    });
  }

  add(): void {
    this.rows.update((r) => [...r, { key: '', value: '' }]);
  }

  remove(index: number): void {
    this.rows.update((r) => r.filter((_, i) => i !== index));
    this.emit();
  }

  updateKey(index: number, key: string): void {
    this.rows.update((r) => r.map((row, i) => i === index ? { ...row, key } : row));
    this.emit();
  }

  updateValue(index: number, value: string): void {
    this.rows.update((r) => r.map((row, i) => i === index ? { ...row, value } : row));
    this.emit();
  }

  private emit(): void {
    const rows = this.rows().filter((r) => r.key.trim());
    if (rows.length === 0) {
      this.valueChange.emit(undefined);
      return;
    }
    this.valueChange.emit(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  }
}
