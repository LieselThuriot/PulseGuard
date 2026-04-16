import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartConfiguration } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { PulseMetricsResultGroup, PulseAgentCheckResultDetail } from '../../../../models/pulse-detail.model';

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

  readonly hasCpu = computed(() => this.metrics().items.some((i) => i.cpu != null));
  readonly hasMemory = computed(() => this.metrics().items.some((i) => i.memory != null));
  readonly hasIo = computed(() => this.metrics().items.some((i) => i.inputOutput != null));

  readonly cpuData = computed<ChartData<'line'>>(() => this.buildChartData('cpu'));
  readonly memoryData = computed<ChartData<'line'>>(() => this.buildChartData('memory'));
  readonly ioData = computed<ChartData<'line'>>(() => this.buildChartData('io'));

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'hour', displayFormats: { hour: 'HH:mm', day: 'MMM d' } },
        ticks: { maxTicksLimit: 6 },
      },
      y: { beginAtZero: true, title: { display: true, text: '%' } },
    },
    plugins: { legend: { display: false } },
  };

  private buildChartData(metric: 'cpu' | 'memory' | 'io'): ChartData<'line'> {
    const items = this.metrics().items;
    const dec = this.decimation();
    const bucketMs = dec * 60 * 1000;
    const map = new Map<number, MetricBucket>();

    for (const item of items) {
      const val = metric === 'cpu' ? item.cpu : metric === 'memory' ? item.memory : item.inputOutput;
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
    const data = sorted.map((b) => b.values.reduce((s, v) => s + v, 0) / b.values.length);

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
