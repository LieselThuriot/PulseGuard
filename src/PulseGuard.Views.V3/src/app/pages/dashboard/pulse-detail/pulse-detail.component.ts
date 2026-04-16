import { Component, ChangeDetectionStrategy, input, signal, computed, effect, OnDestroy } from '@angular/core';
import { forkJoin, of, Subject, switchMap, takeUntil, catchError } from 'rxjs';
import { PulseDetailService } from '../../../services/pulse-detail.service';
import { PulseCheckResultDetail, PulseDetailResultGroup, PulseMetricsResultGroup } from '../../../models/pulse-detail.model';
import { PulseHeatmaps } from '../../../models/pulse-heatmap.model';
import { PulseDeployment } from '../../../models/pulse-overview.model';
import { PulseStates, STATE_CSS_CLASSES } from '../../../models/pulse-states.enum';
import { ResponseChartComponent } from './response-chart/response-chart.component';
import { MetricsChartComponent } from './metrics-chart/metrics-chart.component';
import { HeatmapComponent } from './heatmap/heatmap.component';
import { LogEntriesComponent } from './log-entries/log-entries.component';
import { LivePulseComponent } from './live-pulse/live-pulse.component';
import { ForecastComponent } from './forecast/forecast.component';
import { HealthBarComponent } from '../../../components/health-bar/health-bar.component';
import { StatusBadgeComponent } from '../../../components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../../components/loading-spinner/loading-spinner.component';
import { DateRangeSelectorComponent, DateRange } from '../../../components/date-range-selector/date-range-selector.component';

@Component({
  selector: 'app-pulse-detail',
  standalone: true,
  imports: [
    ResponseChartComponent,
    MetricsChartComponent,
    HeatmapComponent,
    LogEntriesComponent,
    LivePulseComponent,
    ForecastComponent,
    HealthBarComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent,
    DateRangeSelectorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pulse-detail.component.html',
  styleUrl: './pulse-detail.component.css',
})
export class PulseDetailComponent implements OnDestroy {
  readonly pulseId = input.required<string>();

  readonly loading = signal(true);
  readonly detailData = signal<PulseDetailResultGroup | null>(null);
  readonly metricsData = signal<PulseMetricsResultGroup | null>(null);
  readonly heatmapData = signal<PulseHeatmaps | null>(null);
  readonly deployments = signal<PulseDeployment[]>([]);
  readonly archivedMerged = signal(false);

  readonly dateRange = signal<DateRange>({ from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date(), label: '24h' });
  readonly decimation = signal(15);
  readonly percentile = signal(99);
  readonly showLogs = signal(false);
  readonly showLive = signal(false);
  readonly showForecast = signal(false);

  readonly headerText = computed(() => {
    const data = this.detailData();
    if (!data) return '...';
    return data.group ? `${data.group} > ${data.name}` : data.name;
  });

  readonly currentState = computed<PulseStates>(() => {
    const data = this.detailData();
    if (!data?.items?.length) return PulseStates.Unknown;
    const last = data.items[data.items.length - 1];
    return last.state;
  });

  readonly filteredItems = computed<PulseCheckResultDetail[]>(() => {
    const data = this.detailData();
    if (!data?.items) return [];
    const range = this.dateRange();
    const from = range.from.getTime();
    const to = range.to.getTime();
    if (range.label === 'All') return data.items;
    return data.items.filter((i) => i.timestamp >= from && i.timestamp <= to);
  });

  readonly stats = computed(() => {
    const items = this.filteredItems();
    if (!items.length) return { since: '...', average: '...', uptime: '...', errorRate: '...', timeoutRate: '...', volatility: '...' };

    const first = items[0];
    const since = new Date(first.timestamp).toLocaleString();

    const withElapsed = items.filter((i) => i.elapsedMilliseconds != null && i.elapsedMilliseconds > 0);
    const avgMs = withElapsed.length > 0
      ? withElapsed.reduce((sum, i) => sum + (i.elapsedMilliseconds ?? 0), 0) / withElapsed.length
      : 0;
    const average = avgMs > 0 ? `${avgMs.toFixed(0)} ms` : 'N/A';

    const total = items.length;
    const healthy = items.filter((i) => i.state === PulseStates.Healthy).length;
    const unhealthy = items.filter((i) => i.state === PulseStates.Unhealthy).length;
    const timedOut = items.filter((i) => i.state === PulseStates.TimedOut).length;

    const uptime = `${((healthy / total) * 100).toFixed(2)}%`;
    const errorRate = `${((unhealthy / total) * 100).toFixed(2)}%`;
    const timeoutRate = `${((timedOut / total) * 100).toFixed(2)}%`;

    // Volatility: count of state transitions divided by total
    let transitions = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i].state !== items[i - 1].state) transitions++;
    }
    const volatility = total > 1 ? `${((transitions / (total - 1)) * 100).toFixed(2)}%` : 'N/A';

    return { since, average, uptime, errorRate, timeoutRate, volatility };
  });

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly detailService: PulseDetailService) {
    effect(() => {
      const id = this.pulseId();
      if (id) this.loadData(id);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDateRangeChange(range: DateRange): void {
    this.dateRange.set(range);

    // If extending into archived range and not yet merged, reload with archived
    if (!this.archivedMerged()) {
      const midnight = new Date();
      midnight.setUTCHours(0, 0, 0, 0);
      if (range.from.getTime() < midnight.getTime() || range.label === 'All') {
        this.loadArchivedData(this.pulseId());
      }
    }
  }

  onDecimationChange(value: number): void {
    this.decimation.set(value);
  }

  onPercentileChange(value: number): void {
    this.percentile.set(value);
  }

  private loadData(id: string): void {
    this.loading.set(true);
    this.archivedMerged.set(false);

    forkJoin({
      details: this.detailService.getDetails(id).pipe(catchError(() => of(null))),
      metrics: this.detailService.getMetrics(id).pipe(catchError(() => of(null))),
      heatmap: this.detailService.getHeatmap(id).pipe(catchError(() => of(null))),
      deployments: this.detailService.getDeployments(id).pipe(catchError(() => of({ id: '', items: [] }))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.detailData.set(result.details);
          this.metricsData.set(result.metrics);
          this.heatmapData.set(result.heatmap);
          this.deployments.set(result.deployments?.items ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadArchivedData(id: string): void {
    forkJoin({
      archivedDetails: this.detailService.getArchivedDetails(id).pipe(catchError(() => of(null))),
      archivedMetrics: this.detailService.getArchivedMetrics(id).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (archived) => {
          const current = this.detailData();
          if (archived.archivedDetails && current) {
            this.detailData.set({
              ...current,
              items: [...archived.archivedDetails.items, ...current.items],
            });
          }

          const currentMetrics = this.metricsData();
          if (archived.archivedMetrics && currentMetrics) {
            this.metricsData.set({
              items: [...archived.archivedMetrics.items, ...currentMetrics.items],
            });
          }

          this.archivedMerged.set(true);
        },
      });
  }
}
