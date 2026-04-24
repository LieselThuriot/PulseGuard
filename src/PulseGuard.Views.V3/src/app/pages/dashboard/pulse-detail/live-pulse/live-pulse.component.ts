import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Injector, inject, effect,
} from '@angular/core';
import * as d3 from 'd3';
import { EventService } from '../../../../services/event.service';
import { PulseStates, STATE_COLORS } from '../../../../models/pulse-states.enum';
import { LIVE_PULSE_MAX_POINTS } from '../../../../constants';

interface LivePoint {
  timestamp: number;
  elapsedMs: number;
  state: PulseStates;
}

@Component({
  selector: 'app-live-pulse',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-pulse.component.html',
  styleUrl: './live-pulse.component.css',
})
export class LivePulseComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly pulseId = input.required<string>();
  readonly close = output<void>();

  @ViewChild('chart') chartRef!: ElementRef<SVGSVGElement>;

  readonly points = signal<LivePoint[]>([]);
  readonly connected = signal(false);

  private readonly injector = inject(Injector);
  private _interval: ReturnType<typeof setInterval> | null = null;
  private _renderFrameId: number | null = null;

  constructor(private readonly eventService: EventService) {}

  ngOnInit(): void {
    this.eventService.connectApplication(this.pulseId());

    this._interval = setInterval(() => {
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
            if (updated.length > LIVE_PULSE_MAX_POINTS) updated.shift();
            return updated;
          });
        }
        this.connected.set(true);
      }
    }, 500);
  }

  ngAfterViewInit(): void {
    effect(() => {
      this.points();
      this.scheduleRender();
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.eventService.disconnect();
    if (this._interval) clearInterval(this._interval);
    if (this._renderFrameId !== null) cancelAnimationFrame(this._renderFrameId);
  }

  private scheduleRender(): void {
    if (this._renderFrameId !== null) cancelAnimationFrame(this._renderFrameId);
    this._renderFrameId = requestAnimationFrame(() => {
      this._renderFrameId = null;
      this.render();
    });
  }

  onClose(): void {
    this.close.emit();
  }

  private render(): void {
    const svgEl = this.chartRef?.nativeElement;
    if (!svgEl) return;

    const pts = this.points();
    const container = svgEl.parentElement!;
    const totalWidth = container.clientWidth || 500;
    const totalHeight = 400;

    const margin = { top: 10, right: 16, bottom: 30, left: 50 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', totalWidth).attr('height', totalHeight);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -42).attr('x', -height / 2)
      .attr('text-anchor', 'middle').attr('font-size', '11px')
      .text('ms');

    if (!pts.length) {
      g.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(d3.scaleTime()).ticks(0));
      g.append('g').call(d3.axisLeft(d3.scaleLinear()).ticks(0));
      return;
    }

    const xScale = d3.scaleTime()
      .domain(d3.extent(pts, (p) => p.timestamp) as [number, number])
      .range([0, width]);
    const yMax = (d3.max(pts, (p) => p.elapsedMs) ?? 0) * 1.1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();

    g.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat('%H:%M:%S') as any));
    g.append('g').call(d3.axisLeft(yScale).ticks(5));

    // Group into consecutive color segments for per-point coloring
    const segments: LivePoint[][] = [];
    let cur: LivePoint[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      cur.push(pts[i]);
      if (pts[i].state !== pts[i - 1].state || i === pts.length - 1) {
        segments.push(cur);
        cur = [pts[i]];
      }
    }
    if (cur.length > 1) segments.push(cur);

    for (const seg of segments) {
      const lineGen = d3.line<LivePoint>()
        .x((p) => xScale(p.timestamp))
        .y((p) => yScale(p.elapsedMs))
        .curve(d3.curveCatmullRom.alpha(0.1));

      g.append('path').datum(seg)
        .attr('fill', 'none')
        .attr('stroke', STATE_COLORS[seg[0].state])
        .attr('stroke-width', 2)
        .attr('d', lineGen)
        .style('opacity', 0)
        .transition().duration(300)
        .style('opacity', 1);
    }

    // Dots
    g.selectAll<SVGCircleElement, LivePoint>('circle')
      .data(pts)
      .join('circle')
      .attr('cx', (p) => xScale(p.timestamp))
      .attr('cy', (p) => yScale(p.elapsedMs))
      .attr('r', 3)
      .attr('fill', (p) => STATE_COLORS[p.state]);
  }
}
