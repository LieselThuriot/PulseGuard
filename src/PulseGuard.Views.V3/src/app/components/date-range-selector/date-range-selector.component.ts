import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const PRESETS: { label: string; hours: number }[] = [
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '1w', hours: 168 },
  { label: '1m', hours: 720 },
  { label: '3m', hours: 2160 },
  { label: '6m', hours: 4320 },
  { label: '1y', hours: 8760 },
];

@Component({
  selector: 'app-date-range-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-range-selector.component.html',
  styleUrl: './date-range-selector.component.css',
})
export class DateRangeSelectorComponent {
  readonly rangeChange = output<DateRange>();
  readonly activeLabel = signal('24h');
  readonly presets = PRESETS;

  constructor() {
    // Default to 24h
    this.selectPreset(PRESETS[1]);
  }

  selectPreset(preset: { label: string; hours: number }): void {
    this.activeLabel.set(preset.label);
    const to = new Date();
    const from = new Date(to.getTime() - preset.hours * 60 * 60 * 1000);
    this.rangeChange.emit({ from, to, label: preset.label });
  }

  selectAll(): void {
    this.activeLabel.set('All');
    this.rangeChange.emit({ from: new Date(0), to: new Date(), label: 'All' });
  }
}
