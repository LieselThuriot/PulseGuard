import {
  Component, ChangeDetectionStrategy, input, computed,
  ViewChild, ElementRef, effect, Injector, inject, AfterViewInit, OnDestroy,
} from '@angular/core';
import * as d3 from 'd3';
import { PulseMetricsResultGroup, PulseAgentCheckResultDetail } from '../../../../models/pulse-detail.model';
import { DateRange } from '../../../../components/date-range-selector/date-range-selector.component';
import { groupByTimeBucket, calculatePercentile } from '../chart-utils';
import { applyTimeAxis, createCrosshair, positionTooltip, setupBrushAndZoom } from '../chart-rendering';

interface MetricBucket {
  timestamp: number;
  value: number;
}

@Component({
  selector: 'app-metrics-chart',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './metrics-chart.component.html',
  styleUrl: './metrics-chart.component.css',
})
export class MetricsChartComponent implements AfterViewInit, OnDestroy {
  readonly metrics = input.required<PulseMetricsResultGroup>();
  readonly decimation = input(15);
  readonly percentile = input(99);
  readonly dateRange = input<DateRange | null>(null);

  @ViewChild('cpuChart') cpuRef!: ElementRef<SVGSVGElement>;
  @ViewChild('memChart') memRef!: ElementRef<SVGSVGElement>;
  @ViewChild('ioChart') ioRef!: ElementRef<SVGSVGElement>;
  @ViewChild('cpuTooltip') cpuTooltipRef!: ElementRef<HTMLDivElement>;
  @ViewChild('memTooltip') memTooltipRef!: ElementRef<HTMLDivElement>;
  @ViewChild('ioTooltip') ioTooltipRef!: ElementRef<HTMLDivElement>;

  private readonly injector = inject(Injector);
  private resizeObserver: ResizeObserver | null = null;
  private renderFrameId: number | null = null;

  readonly filteredItems = computed<PulseAgentCheckResultDetail[]>(() => {
    const items = this.metrics().items;
    const range = this.dateRange();
    if (!range || range.from.getTime() === 0) return items;
    const from = range.from.getTime();
    const to = range.to.getTime();
    return items.filter((i) => i.timestamp >= from && i.timestamp <= to);
  });

  readonly hasCpu = computed(() => this.filteredItems().some((i) => i.cpu != null));
  readonly hasMemory = computed(() => this.filteredItems().some((i) => i.memory != null));
  readonly hasIo = computed(() => this.filteredItems().some((i) => i.inputOutput != null));

  ngAfterViewInit(): void {
    effect(() => {
      this.filteredItems();
      this.decimation();
      this.percentile();
      this.scheduleRender();
    }, { injector: this.injector });

    this.resizeObserver = new ResizeObserver(() => this.scheduleRender());
    if (this.cpuRef?.nativeElement.parentElement) {
      this.resizeObserver.observe(this.cpuRef.nativeElement.parentElement!);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.renderFrameId !== null) cancelAnimationFrame(this.renderFrameId);
  }

  private scheduleRender(): void {
    if (this.renderFrameId !== null) cancelAnimationFrame(this.renderFrameId);
    this.renderFrameId = requestAnimationFrame(() => {
      this.renderFrameId = null;
      this.renderAll();
    });
  }

  private renderAll(): void {
    const items = this.filteredItems();
    const dec = this.decimation();
    const pct = this.percentile();
    if (this.hasCpu() && this.cpuRef) {
      const data = this.buildBuckets(items, 'cpu', dec, pct);
      this.renderChart(this.cpuRef.nativeElement, this.cpuTooltipRef?.nativeElement, data, 'CPU', '%', 'var(--pg-metric-cpu)', 'var(--pg-metric-cpu-fill)');
    }
    if (this.hasMemory() && this.memRef) {
      const data = this.buildBuckets(items, 'memory', dec, pct);
      this.renderChart(this.memRef.nativeElement, this.memTooltipRef?.nativeElement, data, 'Memory', '%', 'var(--pg-metric-memory)', 'var(--pg-metric-memory-fill)');
    }
    if (this.hasIo() && this.ioRef) {
      const data = this.buildBuckets(items, 'io', dec, pct);
      this.renderChart(this.ioRef.nativeElement, this.ioTooltipRef?.nativeElement, data, 'I/O', 'MB/s', 'var(--pg-metric-io)', 'var(--pg-metric-io-fill)');
    }
  }

  private renderChart(
    svgEl: SVGSVGElement,
    tooltipEl: HTMLDivElement | undefined,
    data: MetricBucket[],
    seriesName: string,
    yLabel: string,
    color: string,
    fillColor: string,
  ): void {
    const container = svgEl.parentElement!;
    const totalWidth = container.clientWidth || 400;
    const totalHeight = 200;

    const margin = { top: 8, right: 35, bottom: 42, left: 50 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', totalWidth).attr('height', totalHeight);
    svg.selectAll('*').remove();

    const clipId = `clip-metric-${seriesName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.random().toString(36).slice(2, 8)}`;
    svg.append('defs').append('clipPath').attr('id', clipId)
      .append('rect').attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    if (!data.length) return;

    const xExtent = d3.extent(data, (d) => d.timestamp) as [number, number];
    const xScale = d3.scaleTime().domain([xExtent[0], xExtent[1]]).range([0, width]);
    const initialYMax = (d3.max(data, (d) => d.value) ?? 0) * 1.1;
    const yScale = d3.scaleLinear().domain([0, initialYMax]).range([height, 0]).nice();

    const xAxisG = g.append('g').attr('transform', `translate(0,${height})`);

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((v) =>
      yLabel === 'MB/s' ? `${(v as number).toFixed(1)}` : `${v as number}%`,
    );

    applyTimeAxis(xAxisG, xScale, 6);
    g.append('g').attr('class', 'y-axis').call(yAxis);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -42).attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(yLabel);

    const plotG = g.append('g').attr('clip-path', `url(#${clipId})`);

    const area = d3.area<MetricBucket>()
      .x((d) => xScale(d.timestamp))
      .y0(height)
      .y1((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.1));

    const line = d3.line<MetricBucket>()
      .x((d) => xScale(d.timestamp))
      .y((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.1));

    plotG.append('path').datum(data)
      .style('fill', fillColor)
      .attr('d', area);
    plotG.append('path').datum(data)
      .attr('fill', 'none')
      .style('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Redraw helper
    const redrawPaths = (xSc: d3.ScaleTime<number, number>) => {
      const [xMin, xMax] = xSc.domain().map((d: Date) => +d);
      const visibleData = data.filter((d) => d.timestamp >= xMin && d.timestamp <= xMax);
      const visibleMax = d3.max(visibleData, (d) => d.value) ?? 0;
      const newYMax = visibleMax * 1.1 || initialYMax;
      yScale.domain([0, newYMax]).nice();
      g.select<SVGGElement>('.y-axis').call(yAxis);

      applyTimeAxis(xAxisG, xSc, 6);
      plotG.selectAll('path').remove();
      const rArea = d3.area<MetricBucket>()
        .x((d) => xSc(d.timestamp)).y0(height).y1((d) => yScale(d.value))
        .curve(d3.curveCatmullRom.alpha(0.1));
      const rLine = d3.line<MetricBucket>()
        .x((d) => xSc(d.timestamp)).y((d) => yScale(d.value))
        .curve(d3.curveCatmullRom.alpha(0.1));
      plotG.insert('path', ':first-child').datum(data)
        .style('fill', fillColor).attr('d', rArea);
      plotG.insert('path', ':nth-child(2)').datum(data)
        .attr('fill', 'none').style('stroke', color).attr('stroke-width', 1.5).attr('d', rLine);
    };

    // Crosshair appended before setupBrushAndZoom so it sits behind the brush group
    const vline = createCrosshair(plotG, height);

    // Brush-to-zoom + Ctrl+wheel zoom (brush appended to plotG, after the crosshair)
    const { brushG, getCurrentScale } = setupBrushAndZoom({
      svg, brushParent: plotG, xScale, width, height, onRedraw: redrawPaths,
    });

    // Tooltip via brush overlay
    if (tooltipEl) {
      const bisect = d3.bisector<MetricBucket, number>((d) => d.timestamp).left;
      const tooltip = d3.select(tooltipEl);

      brushG.select<SVGRectElement>('.overlay')
        .on('mousemove', (event) => {
          const [mx] = d3.pointer(event);
          const scale = getCurrentScale();
          const t = scale.invert(mx).getTime();
          const idx = Math.min(bisect(data, t, 1), data.length - 1);
          const pt = data[idx];
          vline.attr('x1', scale(pt.timestamp)).attr('x2', scale(pt.timestamp)).style('opacity', 1);
          const val = yLabel === 'MB/s' ? `${pt.value.toFixed(2)} MB/s` : `${pt.value.toFixed(1)}%`;
          const ts = new Date(pt.timestamp).toLocaleString();
          positionTooltip(tooltip, tooltipEl, event,
            `<div class="tt-date">${ts}</div><div class="tt-row"><span class="tt-swatch" style="background:${color}"></span><span class="tt-label">${seriesName}:</span> <span class="tt-value">${val}</span></div>`,
          );
        })
        .on('mouseout', () => {
          vline.style('opacity', 0);
          tooltip.style('opacity', '0');
        });
    }
  }

  private buildBuckets(
    items: PulseAgentCheckResultDetail[],
    metric: 'cpu' | 'memory' | 'io',
    dec: number,
    pct: number,
  ): MetricBucket[] {
    const getMetricValue = (item: PulseAgentCheckResultDetail): number | null | undefined =>
      metric === 'cpu' ? item.cpu : metric === 'memory' ? item.memory : item.inputOutput;

    const filtered = items.filter((i) => getMetricValue(i) != null);
    const grouped = groupByTimeBucket(filtered, dec, (i) => i.timestamp);

    return Array.from(grouped.entries()).map(([timestamp, bucket]) => {
      const values = bucket.map((i) => getMetricValue(i) as number);
      let v = calculatePercentile(values, pct);
      if (metric === 'io') v = v / 1024 / 1024;
      return { timestamp, value: v };
    });
  }
}
