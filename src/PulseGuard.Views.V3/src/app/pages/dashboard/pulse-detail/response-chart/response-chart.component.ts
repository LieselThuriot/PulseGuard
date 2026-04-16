import {
  Component, ChangeDetectionStrategy, input, computed,
  ViewChild, ElementRef, effect, OnDestroy
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { PulseCheckResultDetail } from '../../../../models/pulse-detail.model';
import { PulseDeployment } from '../../../../models/pulse-overview.model';
import { PulseStates, STATE_COLORS } from '../../../../models/pulse-states.enum';

interface TimeBucket {
  timestamp: number;
  values: number[];
  states: PulseStates[];
}

@Component({
  selector: 'app-response-chart',
  standalone: true,
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './response-chart.component.html',
  styleUrl: './response-chart.component.css',
})
export class ResponseChartComponent {
  readonly items = input.required<PulseCheckResultDetail[]>();
  readonly decimation = input(15);
  readonly percentile = input(99);
  readonly deployments = input<PulseDeployment[]>([]);

  readonly chartData = computed<ChartData<'line'>>(() => {
    const items = this.items();
    const dec = this.decimation();
    const pct = this.percentile();

    const buckets = this.createBuckets(items, dec);
    const labels: number[] = [];
    const values: number[] = [];
    const pointColors: string[] = [];
    const segmentColors: string[] = [];

    for (const bucket of buckets) {
      labels.push(bucket.timestamp);
      const val = this.calculatePercentile(bucket.values, pct);
      values.push(val);

      const worstState = this.getWorstState(bucket.states);
      const color = STATE_COLORS[worstState];
      pointColors.push(color);
      segmentColors.push(color);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Response time (ms)',
          data: values,
          borderColor: segmentColors,
          backgroundColor: pointColors,
          pointBackgroundColor: pointColors,
          borderWidth: 1.5,
          pointRadius: 1,
          tension: 0.1,
          fill: false,
          segment: {
            borderColor: (ctx: any) => {
              const idx = ctx.p0DataIndex;
              return segmentColors[idx] ?? STATE_COLORS[PulseStates.Unknown];
            },
          },
        },
      ],
    };
  });

  readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const deploys = this.deployments();
    const annotations: Record<string, any> = {};

    deploys.forEach((d, i) => {
      annotations[`deploy${i}`] = {
        type: 'line',
        xMin: new Date(d.from).getTime(),
        xMax: new Date(d.from).getTime(),
        borderColor: 'rgba(13, 110, 253, 0.5)',
        borderWidth: 2,
        borderDash: [5, 5],
        label: {
          display: true,
          content: d.buildNumber ?? 'Deploy',
          position: 'start',
          font: { size: 10 },
        },
      };
    });

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'hour', displayFormats: { hour: 'HH:mm', day: 'MMM d' } },
          ticks: { maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'ms' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.parsed.y?.toFixed(0)} ms`,
          },
        },
        annotation: { annotations } as any,
      } as any,
    };
  });

  private createBuckets(items: PulseCheckResultDetail[], decimationMinutes: number): TimeBucket[] {
    if (!items.length) return [];

    const bucketMs = decimationMinutes * 60 * 1000;
    const map = new Map<number, TimeBucket>();

    for (const item of items) {
      const key = Math.floor(item.timestamp / bucketMs) * bucketMs;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = { timestamp: key, values: [], states: [] };
        map.set(key, bucket);
      }
      if (item.elapsedMilliseconds != null) {
        bucket.values.push(item.elapsedMilliseconds);
      }
      bucket.states.push(item.state);
    }

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (!values.length) return 0;
    if (percentile === 0) return values.reduce((a, b) => a + b, 0) / values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private getWorstState(states: PulseStates[]): PulseStates {
    const priority = [PulseStates.Unknown, PulseStates.Healthy, PulseStates.Degraded, PulseStates.TimedOut, PulseStates.Unhealthy];
    let worst = 0;
    for (const s of states) {
      const idx = priority.indexOf(s);
      if (idx > worst) worst = idx;
    }
    return priority[worst];
  }
}
