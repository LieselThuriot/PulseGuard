import { Component, ChangeDetectionStrategy, input, output, signal, computed, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin, of, Subject, switchMap, takeUntil, catchError, distinctUntilChanged, map } from 'rxjs';
import { PulseDetailService } from '../../../services/pulse-detail.service';
import { PulseCheckResultDetail, PulseDetailResultGroup, PulseMetricsResultGroup, OverlayData } from '../../../models/pulse-detail.model';
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
import { DEFAULT_DECIMATION, DEFAULT_PERCENTILE } from '../../../constants';

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
  readonly deselect = output<void>();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly detailData = signal<PulseDetailResultGroup | null>(null);
  readonly metricsData = signal<PulseMetricsResultGroup | null>(null);
  readonly heatmapData = signal<PulseHeatmaps | null>(null);
  readonly deployments = signal<PulseDeployment[]>([]);
  readonly overlayData = signal<OverlayData[]>([]);
  readonly overlayIds = signal<string[]>([]);
  readonly archivedMerged = signal(false);
  readonly archivedLoading = signal(false);

  readonly dateRange = signal<DateRange>((() => { const f = new Date(); f.setUTCHours(0,0,0,0); const t = new Date(f); t.setUTCHours(23,59,59,999); return { from: f, to: t }; })());
  readonly externalDateRange = signal<DateRange | null>(null);
  readonly decimation = signal(+(this.route.snapshot.queryParamMap.get('decimation') ?? DEFAULT_DECIMATION));
  readonly percentile = signal(+(this.route.snapshot.queryParamMap.get('percentile') ?? DEFAULT_PERCENTILE));
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

  readonly filteredOverlayData = computed<OverlayData[]>(() => {
    const overlays = this.overlayData();
    const range = this.dateRange();
    const from = range.from.getTime();
    const to = range.to.getTime();
    if (from === 0) return overlays;
    return overlays.map(overlay => ({
      ...overlay,
      items: overlay.items.filter(i => i.timestamp >= from && i.timestamp <= to),
    }));
  });

  readonly filteredItems = computed<PulseCheckResultDetail[]>(() => {
    const data = this.detailData();
    if (!data?.items) return [];
    const range = this.dateRange();
    const from = range.from.getTime();
    const to = range.to.getTime();
    if (range.from.getTime() === 0) return data.items;
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
    combineLatest([
      toObservable(this.pulseId),
      this.route.queryParamMap.pipe(
        map(p => p.getAll('overlay').sort().join(',')),
        distinctUntilChanged(),
      ),
    ])
      .pipe(
        switchMap(([id, _overlayKey]) => {
          this.loading.set(true);
          this.detailData.set(null);
          this.metricsData.set(null);
          this.heatmapData.set(null);
          this.deployments.set([]);
          this.overlayData.set([]);
          this.overlayIds.set([]);
          this.archivedMerged.set(false);
          this.archivedLoading.set(false);
          this.externalDateRange.set(null);
          this.dateRange.set({ from: new Date(Date.now() - 24 * 60 * 60 * 1000), to: new Date() });

          const overlayIds = [...new Set(this.route.snapshot.queryParamMap.getAll('overlay'))].filter(o => o !== id);
          this.overlayIds.set(overlayIds);
          const overlayObs = overlayIds.length > 0
            ? forkJoin(overlayIds.map(oid => this.detailService.getDetails(oid).pipe(catchError(() => of(null)))))
            : of([] as (PulseDetailResultGroup | null)[]);

          return forkJoin({
            details: this.detailService.getDetails(id).pipe(catchError(() => of(null))),
            metrics: this.detailService.getMetrics(id).pipe(catchError(() => of(null))),
            heatmap: this.detailService.getHeatmap(id).pipe(catchError(() => of(null))),
            deployments: this.detailService.getDeployments(id).pipe(catchError(() => of({ id: '', items: [] }))),
            overlayDetails: overlayObs,
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (result) => {
          this.detailData.set(result.details);
          this.metricsData.set(result.metrics);
          this.heatmapData.set(result.heatmap);
          this.deployments.set(result.deployments?.items ?? []);
          this.overlayData.set(
            (result.overlayDetails ?? [])
              .filter((d): d is PulseDetailResultGroup => d !== null)
              .map(d => ({ label: d.group ? `${d.group} > ${d.name}` : d.name, items: d.items }))
          );
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
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
      if (range.from.getTime() < midnight.getTime() || range.from.getTime() === 0) {
        this.archivedLoading.set(true);
        this.loadArchivedData(this.pulseId());
      }
    }
  }

  onDecimationChange(value: number): void {
    this.decimation.set(value);
    this.syncParamToUrl('decimation', String(value), String(DEFAULT_DECIMATION));
  }

  onPercentileChange(value: number): void {
    this.percentile.set(value);
    this.syncParamToUrl('percentile', String(value), String(DEFAULT_PERCENTILE));
  }

  private syncParamToUrl(key: string, value: string, defaultValue: string): void {
    const urlTree = this.router.parseUrl(this.router.url);
    if (value === defaultValue) {
      delete urlTree.queryParams[key];
    } else {
      urlTree.queryParams[key] = value;
    }
    this.router.navigateByUrl(urlTree, { replaceUrl: true });
  }

  onHeatmapDayClicked(dayKey: string): void {
    const from = new Date(dayKey + 'T00:00:00.000Z');
    const to = new Date(dayKey + 'T23:59:59.999Z');
    const range: DateRange = { from, to };
    this.externalDateRange.set(range);
    this.onDateRangeChange(range);
  }

  openForecast(): void {
    if (!this.archivedMerged() && !this.archivedLoading()) {
      this.archivedLoading.set(true);
      this.loadArchivedData(this.pulseId());
    }
    this.showForecast.set(true);
  }

  private loadArchivedData(id: string): void {
    const overlayIds = this.overlayIds();
    const overlayArchivedObs = overlayIds.length > 0
      ? forkJoin(overlayIds.map(oid => this.detailService.getArchivedDetails(oid).pipe(catchError(() => of(null)))))
      : of([] as (PulseDetailResultGroup | null)[]);

    forkJoin({
      archivedDetails: this.detailService.getArchivedDetails(id).pipe(catchError(() => of(null))),
      archivedMetrics: this.detailService.getArchivedMetrics(id).pipe(catchError(() => of(null))),
      archivedOverlays: overlayArchivedObs,
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

          const currentOverlays = this.overlayData();
          if (archived.archivedOverlays.length) {
            this.overlayData.set(
              currentOverlays.map((overlay, i) => {
                const archivedOverlay = archived.archivedOverlays[i];
                if (!archivedOverlay) return overlay;
                return { ...overlay, items: [...archivedOverlay.items, ...overlay.items] };
              })
            );
          }

          this.archivedMerged.set(true);
          this.archivedLoading.set(false);
        },
        error: () => this.archivedLoading.set(false),
      });
  }
}
