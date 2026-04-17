import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, ChartData, ChartConfiguration } from 'chart.js';
import 'chartjs-adapter-date-fns';
import ZoomPlugin from 'chartjs-plugin-zoom';
import { PulseMetricsResultGroup, PulseAgentCheckResultDetail } from '../../../../models/pulse-detail.model';
import { DateRange } from '../../../../components/date-range-selector/date-range-selector.component';

Chart.register(ZoomPlugin);

interface MetricBucket {
  timestamp: number;
  values: number[];
}

@Component({
  selector: 'app-metrics-chart',
  standalone: true,
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metrics-chart.component.html',
  styleUrl: './metrics-chart.component.css',
})
export class MetricsChartComponent {
  readonly metrics = input.required<PulseMetricsResultGroup>();
  readonly decimation = input(15);
  readonly percentile = input(99);
  readonly dateRange = input<DateRange | null>(null);

  readonly filteredItems = computed<PulseAgentCheckResultDetail[]>(() => {
    const items = this.metrics().items;
    const range = this.dateRange();
    if (!range || range.label === 'All') return items;
    const from = range.from.getTime();
    const to = range.to.getTime();
    return items.filter(i => i.timestamp >= from && i.timestamp <= to);
  });

  readonly hasCpu = computed(() => this.filteredItems().some((i) => i.cpu != null));
  readonly hasMemory = computed(() => this.filteredItems().some((i) => i.memory != null));
  readonly hasIo = computed(() => this.filteredItems().some((i) => i.inputOutput != null));

  readonly cpuData = computed<ChartData<'line'>>(() => this.buildChartData('cpu'));
  readonly memoryData = computed<ChartData<'line'>>(() => this.buildChartData('memory'));
  readonly ioData = computed<ChartData<'line'>>(() => this.buildChartData('io'));

  readonly cpuOptions = this.makeOptions('%');
  readonly memoryOptions = this.makeOptions('%');
  readonly ioOptions = this.makeOptions('MB/s');

  private makeOptions(yLabel: string): ChartConfiguration<'line'>['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour', displayFormats: { hour: 'HH:mm', day: 'MMM d' } },
          ticks: { maxTicksLimit: 6 },
        },
        y: {
          beginAtZero: true,
          suggestedMax: yLabel === '%' ? 100 : undefined,
          title: { display: true, text: yLabel },
          ticks: {
            callback: (value) => `${(value as number).toFixed(yLabel === '%' ? 0 : 2)}${yLabel}`,
          },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              return yLabel === 'MB/s' ? `${ctx.dataset.label}: ${v.toFixed(2)} MB/s` : `${ctx.dataset.label}: ${v.toFixed(1)}%`;
            },
          },
        },
        zoom: {
          zoom: {
            wheel: { enabled: true, modifierKey: 'ctrl' },
            drag: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
          },
          pan: {
            enabled: true,
            mode: 'x',
            modifierKey: 'ctrl',
          },
          limits: { x: { min: 'original', max: 'original' } },
        },
      },
    };
  }

  private buildChartData(metric: 'cpu' | 'memory' | 'io'): ChartData<'line'> {
    const items = this.filteredItems();
    const dec = this.decimation();
    const pct = this.percentile();
    const bucketMs = dec * 60 * 1000;
    const map = new Map<number, MetricBucket>();

    for (const item of items) {
      let val = metric === 'cpu' ? item.cpu : metric === 'memory' ? item.memory : item.inputOutput;
      if (val == null) continue;

      const key = Math.floor(item.timestamp / bucketMs) * bucketMs;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { timestamp: key, values: [] };
        map.set(key, bucket);
      }
      bucket.values.push(val);
    }

    const sorted = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
    const labels = sorted.map((b) => b.timestamp);
    const data = sorted.map((b) => {
      let v: number;
      if (pct === 0) v = b.values.reduce((s, x) => s + x, 0) / b.values.length;
      else { const sv = [...b.values].sort((a, z) => a - z); v = sv[Math.max(0, Math.ceil((pct / 100) * sv.length) - 1)]; }
      if (metric === 'io') v = v / 1024 / 1024;
      return v;
    });

    const color = metric === 'cpu' ? '#0d6efd' : metric === 'memory' ? '#6f42c1' : '#20c997';

    return {
      labels,
      datasets: [{
        label: metric.toUpperCase(),
        data,
        borderColor: color,
        backgroundColor: color + '33',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        tension: 0.3,
      }],
    };
  }
}
