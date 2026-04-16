import { Component, ChangeDetectionStrategy, input, output, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbOffcanvas } from '@ng-bootstrap/ng-bootstrap';
import { PulseDetailService } from '../../../../services/pulse-detail.service';
import { PulseDetailItem } from '../../../../models/pulse-overview.model';
import { PulseStates, STATE_CSS_CLASSES } from '../../../../models/pulse-states.enum';
import { LoadingSpinnerComponent } from '../../../../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-log-entries',
  standalone: true,
  imports: [LoadingSpinnerComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-entries.component.html',
  styleUrl: './log-entries.component.css',
})
export class LogEntriesComponent implements OnInit {
  readonly pulseId = input.required<string>();
  readonly close = output<void>();

  readonly loading = signal(true);
  readonly entries = signal<PulseDetailItem[]>([]);
  readonly continuationToken = signal<string | undefined>(undefined);
  readonly hasMore = signal(false);

  constructor(private readonly detailService: PulseDetailService) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  loadMore(): void {
    this.loadEntries(this.continuationToken());
  }

  getBadgeClass(state: PulseStates): string {
    return STATE_CSS_CLASSES[state] ?? 'text-bg-secondary';
  }

  formatDuration(from?: string, to?: string): string {
    if (!from || !to) return '...';
    const ms = new Date(to).getTime() - new Date(from).getTime();
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }

  onClose(): void {
    this.close.emit();
  }

  private loadEntries(token?: string): void {
    this.loading.set(true);
    this.detailService.getLogs(this.pulseId(), token).subscribe({
      next: (result) => {
        const existing = token ? this.entries() : [];

        // Fill gaps with Unknown entries
        const items = result.items ?? [];
        const filled: PulseDetailItem[] = [];
        for (let i = 0; i < items.length; i++) {
          filled.push(items[i]);
          if (i < items.length - 1 && items[i].to && items[i + 1].from) {
            const gapStart = new Date(items[i].to!).getTime();
            const gapEnd = new Date(items[i + 1].from!).getTime();
            if (gapEnd - gapStart > 60000) {
              filled.push({
                state: PulseStates.Unknown,
                from: items[i].to,
                to: items[i + 1].from,
                message: 'No data available',
              });
            }
          }
        }

        this.entries.set([...existing, ...filled]);
        this.continuationToken.set(result.continuationToken);
        this.hasMore.set(!!result.continuationToken);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
