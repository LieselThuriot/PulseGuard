import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface HeaderRow { key: string; value: string; }

@Component({
  selector: 'app-header-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header-editor.component.html',
})
export class HeaderEditorComponent implements OnChanges {
  @Input() value: Record<string, string> | undefined;
  @Output() valueChange = new EventEmitter<Record<string, string> | undefined>();

  readonly rows = signal<HeaderRow[]>([]);

  ngOnChanges(): void {
    if (this.value && typeof this.value === 'object') {
      this.rows.set(Object.entries(this.value).map(([key, value]) => ({ key, value: String(value) })));
    } else {
      this.rows.set([]);
    }
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
