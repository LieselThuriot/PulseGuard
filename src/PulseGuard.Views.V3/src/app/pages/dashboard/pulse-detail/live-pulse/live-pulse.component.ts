import {
  Component, ChangeDetectionStrategy, input, output, signal,
  OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Injector, inject, effect,
} from '@angular/core';
import * as d3 from 'd3';
import { EventService } from '../../../../services/event.service';
import { PulseStates, STATE_COLORS } from '../../../../models/pulse-states.enum';
import { LIVE_PULSE_MAX_POINTS } from '../../../../constants';

const OVERLAY_COLORS = ['#6366f1', '#06b6d4', '#f97316', '#a855f7', '#14b8a6'];

interface LivePoint {
  timestamp: number;
  elapsedMs: number;
  state: PulseStates;
  pulseId: string;
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
  readonly overlayIds = input<string[]>([]);
  readonly close = output<void>();

  @ViewChild('chart') chartRef!: ElementRef<SVGSVGElement>;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLDivElement>;

  readonly points = signal<LivePoint[]>([]);
  readonly connected = signal(false);

  private readonly injector = inject(Injector);
  private _processedCount = 0;
  private _interval: ReturnType<typeof setInterval> | null = null;
  private _renderFrameId: number | null = null;
  private readonly _pulseLabels = new Map<string, string>();

  constructor(private readonly eventService: EventService) {}

  ngOnInit(): void {
    const overlayIds = this.overlayIds();
    const hasOverlays = overlayIds.length > 0;
    const allIds = new Set([this.pulseId(), ...overlayIds]);

    this._processedCount = 0;

    if (hasOverlays) {
      this.eventService.connectAll();
    } else {
      this.eventService.connectApplication(this.pulseId());
    }

    this._interval = setInterval(() => {
      const evts = this.eventService.events();
      if (evts.length > this._processedCount) {
        const newEvts = evts.slice(this._processedCount);
        this._processedCount = evts.length;

        const newPoints: LivePoint[] = newEvts
          .filter(evt => !hasOverlays || allIds.has(evt.id))
          .map(evt => {
            if (!this._pulseLabels.has(evt.id)) {
              this._pulseLabels.set(evt.id, evt.group ? `${evt.group} > ${evt.name}` : evt.name);
            }
            return {
              timestamp: Date.now(),
              elapsedMs: evt.elapsedMilliseconds ?? 0,
              state: evt.state ?? PulseStates.Unknown,
              pulseId: evt.id,
            };
          });

        if (newPoints.length > 0) {
          this.points.update(pts => {
            const updated = [...pts, ...newPoints];
            return updated.length > LIVE_PULSE_MAX_POINTS ? updated.slice(-LIVE_PULSE_MAX_POINTS) : updated;
          });
          this.connected.set(true);
        }
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
    const pulseId = this.pulseId();
    const overlayIds = this.overlayIds();
    const hasOverlays = overlayIds.length > 0;

    const container = svgEl.parentElement!;
    const totalWidth = container.clientWidth || 500;
    const totalHeight = container.clientHeight || 500;

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

    // Main pulse: state-colored segments
    const mainPts = hasOverlays ? pts.filter(p => p.pulseId === pulseId) : pts;

    if (mainPts.length > 0) {
      const segments: LivePoint[][] = [];
      let cur: LivePoint[] = [mainPts[0]];
      for (let i = 1; i < mainPts.length; i++) {
        cur.push(mainPts[i]);
        if (mainPts[i].state !== mainPts[i - 1].state || i === mainPts.length - 1) {
          segments.push(cur);
          cur = [mainPts[i]];
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

      g.selectAll<SVGCircleElement, LivePoint>('.dot-main')
        .data(mainPts)
        .join('circle')
        .attr('class', 'dot-main')
        .attr('cx', (p) => xScale(p.timestamp))
        .attr('cy', (p) => yScale(p.elapsedMs))
        .attr('r', 3)
        .attr('fill', (p) => STATE_COLORS[p.state]);
    }

    // Overlay series: dashed lines in overlay colors
    overlayIds.forEach((oid, i) => {
      const overlayPts = pts.filter(p => p.pulseId === oid);
      if (!overlayPts.length) return;

      const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
      const lineGen = d3.line<LivePoint>()
        .x((p) => xScale(p.timestamp))
        .y((p) => yScale(p.elapsedMs))
        .curve(d3.curveCatmullRom.alpha(0.1));

      g.append('path').datum(overlayPts)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,3')
        .attr('d', lineGen)
        .style('opacity', 0)
        .transition().duration(300)
        .style('opacity', 1);

      g.selectAll<SVGCircleElement, LivePoint>(`.dot-overlay-${i}`)
        .data(overlayPts)
        .join('circle')
        .attr('class', `dot-overlay-${i}`)
        .attr('cx', (p) => xScale(p.timestamp))
        .attr('cy', (p) => yScale(p.elapsedMs))
        .attr('r', 3)
        .attr('fill', color);
    });

    // Legend when overlays are present
    if (hasOverlays) {
      const mainLabel = this._pulseLabels.get(pulseId) ?? pulseId;
      const legendItems: { label: string; color: string; dashed: boolean }[] = [
        { label: mainLabel, color: '#6c757d', dashed: false },
        ...overlayIds.map((oid, i) => ({
          label: this._pulseLabels.get(oid) ?? oid,
          color: OVERLAY_COLORS[i % OVERLAY_COLORS.length],
          dashed: true,
        })),
      ];

      const swatchW = 20;
      const maxLabelChars = 18;
      const rowH = 17;
      const padX = 6;
      const padY = 4;
      const legendW = swatchW + 8 + maxLabelChars * 6.2;
      const legendH = legendItems.length * rowH + padY * 2;

      const legendG = svg.append('g')
        .attr('transform', `translate(${margin.left + width - legendW - 2}, ${margin.top + 2})`);

      legendG.append('rect')
        .attr('width', legendW)
        .attr('height', legendH)
        .attr('rx', 3)
        .attr('fill', 'var(--bs-body-bg, #fff)')
        .attr('fill-opacity', 0.85)
        .attr('stroke', 'var(--bs-border-color, #dee2e6)')
        .attr('stroke-width', 1);

      legendItems.forEach((item, i) => {
        const row = legendG.append('g')
          .attr('transform', `translate(${padX}, ${padY + i * rowH + rowH / 2})`);

        row.append('line')
          .attr('x1', 0).attr('x2', swatchW)
          .attr('y1', 0).attr('y2', 0)
          .attr('stroke', item.color)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', item.dashed ? '4,2' : '');

        const labelText = item.label.length > maxLabelChars
          ? item.label.slice(0, maxLabelChars - 1) + '\u2026'
          : item.label;

        row.append('text')
          .attr('x', swatchW + 6)
          .attr('y', 4)
          .attr('font-size', '10px')
          .attr('fill', 'currentColor')
          .text(labelText);
      });
    }

    // Tooltip
    const tooltipEl = this.tooltipRef?.nativeElement;
    if (tooltipEl) {
      const tooltip = d3.select(tooltipEl);
      const bisect = d3.bisector<LivePoint, number>((p) => p.timestamp).center;

      // Build per-series lookup: [{ pts, color, isOverlay }]
      const series: { pts: LivePoint[]; color: (p: LivePoint) => string; label: string | undefined }[] = [];
      if (mainPts.length > 0) {
        series.push({
          pts: mainPts,
          color: (p) => STATE_COLORS[p.state],
          label: this._pulseLabels.get(pulseId),
        });
      }
      overlayIds.forEach((oid, i) => {
        const oPts = pts.filter(p => p.pulseId === oid);
        if (oPts.length > 0) {
          const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length];
          series.push({ pts: oPts, color: () => color, label: this._pulseLabels.get(oid) });
        }
      });

      const vline = g.append('line')
        .attr('stroke', '#999').attr('stroke-width', 1).attr('stroke-dasharray', '3,3')
        .attr('y1', 0).attr('y2', height).style('opacity', 0);

      const showTooltip = (event: MouseEvent, html: string) => {
        const containerW = tooltipEl.parentElement!.clientWidth;
        const containerH = tooltipEl.parentElement!.clientHeight;
        tooltip.html(html).style('opacity', '1');
        const ttW = tooltipEl.offsetWidth;
        const ttH = tooltipEl.offsetHeight;
        const ox = event.offsetX;
        const oy = event.offsetY;
        let left = ox + 12;
        if (left + ttW > containerW) left = ox - ttW - 12;
        left = Math.max(0, left);
        let top = oy - 10;
        if (top - ttH < 0) top = oy + 10 + ttH;
        top = Math.min(top, containerH);
        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      };

      // Transparent rect to capture pointer events
      g.append('rect')
        .attr('width', width).attr('height', height)
        .attr('fill', 'none').attr('pointer-events', 'all')
        .on('mousemove', (event) => {
          const [mx] = d3.pointer(event);
          const t = xScale.invert(mx).getTime();

          // Find nearest point in each series independently
          const hits = series.map(s => {
            const idx = bisect(s.pts, t);
            if (idx < 0 || idx >= s.pts.length) return null;
            return { p: s.pts[idx], color: s.color(s.pts[idx]), label: s.label };
          }).filter((h): h is { p: LivePoint; color: string; label: string | undefined } => h !== null);

          if (!hits.length) { tooltip.style('opacity', '0'); return; }

          // Sort highest elapsedMs first so tooltip order matches graph (top = highest)
          hits.sort((a, b) => b.p.elapsedMs - a.p.elapsedMs);

          // Anchor vline to the highest-value hit's x position
          vline.attr('x1', xScale(hits[0].p.timestamp)).attr('x2', xScale(hits[0].p.timestamp)).style('opacity', 1);

          const ts = new Date(hits[0].p.timestamp).toLocaleTimeString();
          let html = `<div class="tt-date">${ts}</div>`;
          hits.forEach((hit, i) => {
            html += `<div class="tt-section${i < hits.length - 1 ? ' tt-section-divider' : ''}">`
              + (hit.label ? `<div class="tt-row"><span class="tt-swatch" style="background:${hit.color}"></span><span class="tt-value">${hit.label}</span></div>` : '')
              + `<div class="tt-row"><span class="tt-label">Response time:</span> <span class="tt-value">${hit.p.elapsedMs.toFixed(0)} ms</span></div>`
              + `<div class="tt-row"><span class="tt-label">State:</span> <span class="tt-value">${hit.p.state}</span></div>`
              + `</div>`;
          });
          showTooltip(event, html);
        })
        .on('mouseout', () => {
          vline.style('opacity', 0);
          tooltip.style('opacity', '0');
        });
    }
  }
}
