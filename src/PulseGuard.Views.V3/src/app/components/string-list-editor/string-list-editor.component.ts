import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, OnChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-string-list-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './string-list-editor.component.html',
})
export class StringListEditorComponent implements OnChanges {
  @Input() value: string[] = [];
  @Input() placeholder = 'Value';
  @Input() addLabel = 'Add';
  @Output() valueChange = new EventEmitter<string[]>();

  readonly items = signal<string[]>([]);

  ngOnChanges(): void {
    this.items.set(Array.isArray(this.value) ? [...this.value] : []);
  }

  add(): void {
    this.items.update((items) => [...items, '']);
  }

  remove(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
    this.emit();
  }

  update(index: number, val: string): void {
    this.items.update((items) => items.map((item, i) => i === index ? val : item));
    this.emit();
  }

  private emit(): void {
    this.valueChange.emit(this.items().filter((v) => v.trim()));
  }
}
