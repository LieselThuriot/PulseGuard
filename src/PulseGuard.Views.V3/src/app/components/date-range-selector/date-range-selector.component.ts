import { Component, ChangeDetectionStrategy, output, signal, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const PRESETS: { label: string; text: string; hours: number }[] = [
  { label: '12h',  text: 'Last 12 hours', hours: 12 },
  { label: '24h',  text: 'Last 24 hours', hours: 24 },
  { label: '48h',  text: 'Last 48 hours', hours: 48 },
  { label: '1w',   text: 'Last week',     hours: 168 },
  { label: '2w',   text: 'Last 2 weeks',  hours: 336 },
  { label: '1m',   text: 'Last 30 days',  hours: 720 },
  { label: '3m',   text: 'Last 90 days',  hours: 2160 },
];

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-date-range-selector',
  standalone: true,
  imports: [FormsModule, NgbDropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-range-selector.component.html',
  styleUrl: './date-range-selector.component.css',
})
export class DateRangeSelectorComponent implements OnInit {
  readonly rangeChange = output<DateRange>();

  readonly presets = PRESETS;
  readonly activeLabel = signal('today');
  readonly fromValue = signal('');
  readonly toValue = signal('');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const fromParam = params.get('from');
    const toParam = params.get('to');
    const labelParam = params.get('range');

    if (fromParam && toParam) {
      const from = new Date(fromParam);
      const to = new Date(toParam);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        this.activeLabel.set(labelParam ?? 'custom');
        this.fromValue.set(toLocalInputValue(from));
        this.toValue.set(toLocalInputValue(to));
        this.rangeChange.emit({ from, to, label: labelParam ?? 'custom' });
        return;
      }
    }

    // Default: today
    if (labelParam && PRESETS.find(p => p.label === labelParam)) {
      this.applyPreset(PRESETS.find(p => p.label === labelParam)!);
    } else {
      this.selectToday();
    }
  }

  selectPreset(preset: { label: string; text: string; hours: number }): void {
    this.applyPreset(preset);
  }

  selectToday(): void {
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setHours(23, 59, 0, 0);
    this.activeLabel.set('today');
    this.fromValue.set(toLocalInputValue(from));
    this.toValue.set(toLocalInputValue(to));
    this.emit(from, to, 'today');
  }

  selectAll(): void {
    const from = new Date(0);
    const to = new Date();
    to.setHours(23, 59, 0, 0);
    this.activeLabel.set('All');
    this.fromValue.set(toLocalInputValue(from));
    this.toValue.set(toLocalInputValue(to));
    this.emit(from, to, 'All');
  }

  onFromChange(value: string): void {
    this.fromValue.set(value);
    this.activeLabel.set('custom');
    const from = new Date(value);
    const to = new Date(this.toValue());
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      this.emit(from, to, 'custom');
    }
  }

  onToChange(value: string): void {
    this.toValue.set(value);
    this.activeLabel.set('custom');
    const from = new Date(this.fromValue());
    const to = new Date(value);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      this.emit(from, to, 'custom');
    }
  }

  private applyPreset(preset: { label: string; hours: number }): void {
    const to = new Date();
    to.setHours(23, 59, 0, 0);
    const from = new Date(to.getTime() - preset.hours * 60 * 60 * 1000);
    this.activeLabel.set(preset.label);
    this.fromValue.set(toLocalInputValue(from));
    this.toValue.set(toLocalInputValue(to));
    this.emit(from, to, preset.label);
  }

  private emit(from: Date, to: Date, label: string): void {
    const urlTree = this.router.parseUrl(this.router.url);
    if (label === 'today') {
      delete urlTree.queryParams['from'];
      delete urlTree.queryParams['to'];
      delete urlTree.queryParams['range'];
    } else {
      urlTree.queryParams['from'] = from.toISOString();
      urlTree.queryParams['to'] = to.toISOString();
      urlTree.queryParams['range'] = label;
    }
    this.router.navigateByUrl(urlTree, { replaceUrl: true });
    this.rangeChange.emit({ from, to, label });
  }
}
