import { Component, ChangeDetectionStrategy, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-string-list-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './string-list-editor.component.html',
})
export class StringListEditorComponent {
  readonly value = input<string[]>([]);
  readonly placeholder = input('Value');
  readonly addLabel = input('Add');
  readonly valueChange = output<string[]>();

  readonly items = signal<string[]>([]);

  constructor() {
    effect(() => {
      const v = this.value();
      this.items.set(Array.isArray(v) ? [...v] : []);
    });
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
