import {
  Component, ChangeDetectionStrategy, input, computed,
  ViewChild, ElementRef, effect, OnDestroy, Injector, inject, AfterViewInit,
} from '@angular/core';
import * as d3 from 'd3';
import { PulseCheckResultDetail, OverlayData } from '../../../../models/pulse-detail.model';
import { PulseDeployment } from '../../../../models/pulse-overview.model';
import { PulseStates, STATE_COLORS } from '../../../../models/pulse-states.enum';
import { DEFAULT_DECIMATION, DEFAULT_PERCENTILE } from '../../../../constants';
import { createBuckets, calculatePercentile, getWorstState } from '../chart-utils';
import { applyTimeAxis, createCrosshair, positionTooltip, setupBrushAndZoom } from '../chart-rendering';

const OVERLAY_COLORS = ['var(--pg-overlay-1)', 'var(--pg-overlay-2)', 'var(--pg-overlay-3)', 'var(--pg-overlay-4)', 'var(--pg-overlay-5)'];

interface OverlayPoint {
  x: number;
  y: number;
}

interface ChartPoint {
  x: number;
  y: number;
  color: string;
  state: PulseStates;
}

@Component({
  selector: 'app-response-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './response-chart.component.html',
  styleUrl: './response-chart.component.css',
})
export class ResponseChartComponent implements AfterViewInit, OnDestroy {
  readonly items = input.required<PulseCheckResultDetail[]>();
  readonly decimation = input(DEFAULT_DECIMATION);
  readonly percentile = input(DEFAULT_PERCENTILE);
  readonly deployments = input<PulseDeployment[]>([]);
  readonly overlays = input<OverlayData[]>([]);

  @ViewChild('chart') chartRef!: ElementRef<SVGSVGElement>;
  @ViewChild('tooltip') tooltipRef!: ElementRef<HTMLDivElement>;

  private readonly injector = inject(Injector);
  private resizeObserver: ResizeObserver | null = null;
  private renderFrameId: number | null = null;

  readonly chartPoints = computed<ChartPoint[]>(() => {
    const items = this.items();
    const dec = this.decimation();
    const pct = this.percentile();
    const buckets = createBuckets(items, dec);
    return buckets.map((bucket) => {
      const worstState = getWorstState(bucket.states);
      return {
        x: bucket.timestamp,
        y: calculatePercentile(bucket.values, pct),
        color: STATE_COLORS[worstState],
        state: worstState,
      };
    });
  });

  readonly overlayChartSeries = computed<{ label: string; color: string; points: OverlayPoint[] }[]>(() => {
    const dec = this.decimation();
    const pct = this.percentile();
    return this.overlays().map((overlay, i) => ({
      label: overlay.label,
      color: OVERLAY_COLORS[i % OVERLAY_COLORS.length],
      points: createBuckets(overlay.items, dec).map((bucket) => ({
        x: bucket.timestamp,
        y: calculatePercentile(bucket.values, pct),
      })),
    }));
  });

  ngAfterViewInit(): void {
    effect(() => {
      // Subscribe to signals to trigger re-render
      this.chartPoints();
      this.overlayChartSeries();
      this.deployments();
      this.scheduleRender();
    }, { injector: this.injector });

    this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
    this.resizeObserver.observe(this.chartRef.nativeElement.parentElement!);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.renderFrameId !== null) cancelAnimationFrame(this.renderFrameId);
  }

  private scheduleRender(): void {
    if (this.renderFrameId !== null) cancelAnimationFrame(this.renderFrameId);
    this.renderFrameId = requestAnimationFrame(() => {
      this.renderFrameId = null;
      this.render();
    });
  }

  private render(): void {
    const svgEl = this.chartRef?.nativeElement;
    if (!svgEl) return;

    const points = this.chartPoints();
    const deploys = this.deployments();
    const overlaySeries = this.overlayChartSeries();

    const container = svgEl.parentElement!;
    const totalWidth = container.clientWidth || 600;
    // +1 for the main "Response times" row, +12 for top separator + bottom padding
    const legendHeight = overlaySeries.length > 0 ? 12 + (overlaySeries.length + 1) * 18 : 0;
    const totalHeight = 300 + legendHeight;

    const margin = { top: 10, right: 35, bottom: 44, left: 50 };
    const width = totalWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', totalWidth).attr('height', totalHeight);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Clip path to prevent drawing outside plot area
    svg.append('defs').append('clipPath').attr('id', 'response-clip')
      .append('rect').attr('width', width).attr('height', height);

    if (!points.length) return;

    // Compute x domain across main series + all overlays
    const allXValues = [
      ...points.map(p => p.x),
      ...overlaySeries.flatMap(s => s.points.map(p => p.x)),
    ];
    const xExtent = d3.extent(allXValues) as [number, number];
    const xScale = d3.scaleTime().domain([xExtent[0], xExtent[1]]).range([0, width]);

    // Compute y domain across main series + all overlays
    const allYValues = [
      ...points.map(p => p.y),
      ...overlaySeries.flatMap(s => s.points.map(p => p.y)),
    ];
    const yMax = d3.max(allYValues) ?? 0;
    const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([height, 0]).nice();

    const xAxisG = g.append('g').attr('transform', `translate(0,${height})`);

    // Axes
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}`);

    applyTimeAxis(xAxisG, xScale, 10);
    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40).attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text('ms');

    // Plot group with clip
    const plotG = g.append('g').attr('clip-path', 'url(#response-clip)');

    // Deployment helpers
    const tooltip = d3.select(this.tooltipRef.nativeElement);
    const deploymentColor = (status: string): { fill: string; stroke: string } => {
      const s = status?.toLowerCase();
      if (s === 'succeeded')                        return { fill: 'rgba(25,135,84,0.12)',   stroke: 'rgba(25,135,84,0.5)'   };
      if (s === 'failed')                           return { fill: 'rgba(220,53,69,0.12)',   stroke: 'rgba(220,53,69,0.5)'   };
      if (s === 'inprogress' || s === 'in_progress' || s === 'running')
                                                    return { fill: 'rgba(255,193,7,0.12)',   stroke: 'rgba(255,193,7,0.5)'   };
      if (s === 'cancelled' || s === 'canceled')    return { fill: 'rgba(108,117,125,0.12)', stroke: 'rgba(108,117,125,0.5)' };
      return { fill: 'rgba(13,110,253,0.12)', stroke: 'rgba(13,110,253,0.4)' };
    };
    const buildDeployLabel = (d: PulseDeployment): string => {
      const endDate = d.to ? new Date(d.to).toLocaleString() : 'In Progress';
      const rows: string[] = [];
      if (d.buildNumber) rows.push(`<strong>${d.buildNumber}</strong>`);
      if (d.status)      rows.push(`Status: ${d.status}`);
      if (d.type)        rows.push(`Type: ${d.type}`);
      if (d.author)      rows.push(`Author: ${d.author}`);
      if (d.commitId)    rows.push(`Commit: ${d.commitId.slice(0, 8)}`);
      rows.push(`Start: ${new Date(d.from).toLocaleString()}`);
      rows.push(`End: ${endDate}`);
      return rows.join('<br/>');
    };
    const drawDeployments = (xSc: d3.ScaleTime<number, number>) => {
      plotG.selectAll('.deploy-area').remove();
      for (const d of deploys) {
        const x1 = xSc(new Date(d.from).getTime());
        const x2 = d.to ? xSc(new Date(d.to).getTime()) : width;
        const rectX = Math.min(x1, x2);
        const rectW = Math.max(Math.abs(x2 - x1), 2);
        const { fill, stroke } = deploymentColor(d.status);
        plotG.append('rect')
          .attr('class', 'deploy-area')
          .attr('x', rectX).attr('y', 0)
          .attr('width', rectW).attr('height', height)
          .attr('fill', fill)
          .attr('stroke', stroke)
          .attr('stroke-width', 1);
      }
    };
    drawDeployments(xScale);

    // Overlay line drawing helper
    const drawOverlays = (xSc: d3.ScaleTime<number, number>) => {
      plotG.selectAll('.overlay-path').remove();
      for (const series of overlaySeries) {
        if (series.points.length < 2) continue;
        const lineGen = d3.line<OverlayPoint>()
          .x((p) => xSc(p.x))
          .y((p) => yScale(p.y))
          .curve(d3.curveCatmullRom.alpha(0.1));
        plotG.append('path')
          .datum(series.points)
          .attr('class', 'overlay-path')
          .attr('fill', 'none')
          .style('stroke', series.color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '5,3')
          .attr('opacity', 0.85)
          .attr('d', lineGen);
      }
    };
    drawOverlays(xScale);

    // Draw line segments grouped by consecutive color
    const segments = this.groupByColor(points);
    for (const seg of segments) {
      const lineGen = d3.line<ChartPoint>()
        .x((p) => xScale(p.x))
        .y((p) => yScale(p.y))
        .curve(d3.curveCatmullRom.alpha(0.1));

      plotG.append('path')
        .datum(seg)
        .attr('fill', 'none')
        .attr('stroke', seg[0].color)
        .attr('stroke-width', 1.5)
        .attr('d', lineGen);
    }

    // Points
    plotG.selectAll<SVGCircleElement, ChartPoint>('circle')
      .data(points)
      .join('circle')
      .attr('cx', (p) => xScale(p.x))
      .attr('cy', (p) => yScale(p.y))
      .attr('r', 2)
      .attr('fill', (p) => p.color);

    // Redraw helper — takes a live x scale and updates all chart elements
    const redraw = (xSc: d3.ScaleTime<number, number>) => {
      // Rescale Y to only the visible data range
      const [xMin, xMax] = xSc.domain().map((d: Date) => +d);
      const visiblePoints = points.filter(p => p.x >= xMin && p.x <= xMax);
      const visibleOverlayYs = overlaySeries.flatMap(s =>
        s.points.filter(p => p.x >= xMin && p.x <= xMax).map(p => p.y)
      );
      const visibleYMax = d3.max([...visiblePoints.map(p => p.y), ...visibleOverlayYs]) ?? yMax;
      yScale.domain([0, visibleYMax * 1.1]).nice();
      g.select<SVGGElement>('.y-axis').call(yAxis);

      applyTimeAxis(xAxisG, xSc, 10);
      drawDeployments(xSc);
      plotG.selectAll('path').remove();
      plotG.selectAll('circle').remove();
      drawOverlays(xSc);
      for (const seg of segments) {
        const lineGen = d3.line<ChartPoint>()
          .x((p) => xSc(p.x)).y((p) => yScale(p.y))
          .curve(d3.curveCatmullRom.alpha(0.1));
        plotG.append('path')
          .datum(seg).attr('fill', 'none')
          .attr('stroke', seg[0].color).attr('stroke-width', 1.5).attr('d', lineGen);
      }
      plotG.selectAll<SVGCircleElement, ChartPoint>('circle')
        .data(points).join('circle')
        .attr('cx', (p) => xSc(p.x)).attr('cy', (p) => yScale(p.y))
        .attr('r', 2).attr('fill', (p) => p.color);
    };

    // Brush-to-zoom + Ctrl+wheel zoom (brush appended to g, above the clipped plotG)
    const { brushG, getCurrentScale } = setupBrushAndZoom({
      svg, brushParent: g, xScale, width, height, onRedraw: redraw,
    });

    // Crosshair (in plotG, behind the brush group in g)
    const vline = createCrosshair(plotG, height);

    // Unified tooltip via brush overlay (sits on top, captures all pointer events)
    const bisect = d3.bisector<ChartPoint, Date>((p) => p.x).center;
    const bisectOverlay = d3.bisector<OverlayPoint, Date>((p) => p.x).center;

    brushG.select<SVGRectElement>('.overlay')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const scale = getCurrentScale();
        // Check deployment areas first
        const dep = deploys.find((d) => {
          const dx1 = scale(new Date(d.from).getTime());
          const dx2 = d.to ? scale(new Date(d.to).getTime()) : width;
          return mx >= Math.min(dx1, dx2) && mx <= Math.max(dx1, dx2);
        });
        if (dep) {
          vline.style('opacity', 0);
          positionTooltip(tooltip, this.tooltipRef.nativeElement, event, buildDeployLabel(dep));
          return;
        }
        // Find nearest data point — snap crosshair and show tooltip at mouse
        const idx = bisect(points, scale.invert(mx));
        if (idx >= 0 && idx < points.length) {
          const p = points[idx];
          vline.attr('x1', scale(p.x)).attr('x2', scale(p.x)).style('opacity', 1);
          const ts = new Date(p.x).toLocaleString();
          let html = `<div class="tt-date">${ts}</div>`;
          html += `<div class="tt-row"><span class="tt-swatch" style="background:${p.color}"></span><span class="tt-label">Response times (ms):</span> <span class="tt-value">${p.y.toFixed(0)}</span></div>`;
          html += `<div class="tt-row"><span class="tt-label">State:</span> <span class="tt-value">${p.state}</span></div>`;
          for (const series of overlaySeries) {
            const oi = bisectOverlay(series.points, scale.invert(mx));
            if (oi >= 0 && oi < series.points.length) {
              const op = series.points[oi];
              html += `<div class="tt-row"><span class="tt-swatch" style="background:${series.color}"></span><span class="tt-label">${series.label}:</span> <span class="tt-value">${op.y.toFixed(0)}</span></div>`;
            }
          }
          positionTooltip(tooltip, this.tooltipRef.nativeElement, event, html);
          return;
        }
        vline.style('opacity', 0);
        tooltip.style('opacity', '0');
      })
      .on('mouseout', () => {
        vline.style('opacity', 0);
        tooltip.style('opacity', '0');
      });

    // Legend (rendered below chart when overlays are present)
    if (overlaySeries.length > 0) {
      const legendG = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${300 + 4})`);
      legendG.append('line')
        .attr('x1', 0).attr('x2', width)
        .style('stroke', 'var(--pg-legend-separator)').attr('stroke-width', 0.5);
      // Main series entry
      const mainLegendY = 14;
      legendG.append('line')
        .attr('x1', 0).attr('y1', mainLegendY).attr('x2', 18).attr('y2', mainLegendY)
        .style('stroke', 'var(--pg-legend-swatch)').attr('stroke-width', 2);
      legendG.append('text')
        .attr('x', 22).attr('y', mainLegendY + 4)
        .attr('font-size', '11px')
        .text('Response times (ms)');
      // Overlay entries
      for (let i = 0; i < overlaySeries.length; i++) {
        const y = 14 + (i + 1) * 18;
        const series = overlaySeries[i];
        legendG.append('line')
          .attr('x1', 0).attr('y1', y).attr('x2', 18).attr('y2', y)
          .style('stroke', series.color).attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,3');
        legendG.append('text')
          .attr('x', 22).attr('y', y + 4)
          .attr('font-size', '11px')
          .style('fill', series.color)
          .text(series.label);
      }
    }
  }

  /** Split an array of points into consecutive runs of the same color */
  private groupByColor(points: ChartPoint[]): ChartPoint[][] {
    if (!points.length) return [];
    const groups: ChartPoint[][] = [];
    let cur: ChartPoint[] = [points[0]];
    for (let i = 1; i < points.length; i++) {
      // Always include the boundary point in both segments for continuity
      cur.push(points[i]);
      if (points[i].color !== points[i - 1].color || i === points.length - 1) {
        groups.push(cur);
        cur = [points[i]];
      }
    }
    if (cur.length > 1) groups.push(cur);
    return groups;
  }
}
