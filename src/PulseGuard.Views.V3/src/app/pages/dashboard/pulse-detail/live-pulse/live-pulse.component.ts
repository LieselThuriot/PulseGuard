import { Component, ChangeDetectionStrategy, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartConfiguration } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { EventService } from '../../../../services/event.service';
import { PulseStates, STATE_COLORS } from '../../../../models/pulse-states.enum';

interface LivePoint {
  timestamp: number;
  elapsedMs: number;
  state: PulseStates;
}

@Component({
  selector: 'app-live-pulse',
  standalone: true,
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-pulse.component.html',
  styleUrl: './live-pulse.component.css',
})
export class LivePulseComponent implements OnInit, OnDestroy {
  readonly pulseId = input.required<string>();
  readonly close = output<void>();

  readonly points = signal<LivePoint[]>([]);
  readonly connected = signal(false);

  readonly chartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'minute', displayFormats: { minute: 'HH:mm:ss' } },
      },
      y: { beginAtZero: true, title: { display: true, text: 'ms' } },
    },
    plugins: { legend: { display: false } },
  };

  constructor(private readonly eventService: EventService) {}

  ngOnInit(): void {
    this.eventService.connectApplication(this.pulseId());

    // Poll EventService signals for new events
    const checkEvents = setInterval(() => {
      const evts = this.eventService.events();
      if (evts.length > this.points().length) {
        for (let i = this.points().length; i < evts.length; i++) {
          const evt = evts[i];
          const point: LivePoint = {
            timestamp: Date.now(),
            elapsedMs: (evt as any).elapsedMilliseconds ?? 0,
            state: (evt as any).state ?? PulseStates.Unknown,
          };
          this.points.update((pts) => {
            const updated = [...pts, point];
            if (updated.length > 100) updated.shift();
            return updated;
          });
        }
        this.updateChart();
        this.connected.set(true);
      }
    }, 500);

    this._interval = checkEvents;
  }

  private _interval: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    this.eventService.disconnect();
    if (this._interval) clearInterval(this._interval);
  }

  onClose(): void {
    this.close.emit();
  }

  private updateChart(): void {
    const pts = this.points();
    const labels = pts.map((p) => p.timestamp);
    const data = pts.map((p) => p.elapsedMs);
    const colors = pts.map((p) => STATE_COLORS[p.state]);

    this.chartData.set({
      labels,
      datasets: [{
        label: 'Response time (ms)',
        data,
        borderColor: colors,
        pointBackgroundColor: colors,
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.2,
        fill: false,
        segment: {
          borderColor: (ctx: any) => colors[ctx.p0DataIndex] ?? STATE_COLORS[PulseStates.Unknown],
        },
      }],
    });
  }
}
