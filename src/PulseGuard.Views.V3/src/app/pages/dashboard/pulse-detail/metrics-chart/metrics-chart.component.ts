import {
  Component, ChangeDetectionStrategy, input, computed,
  ViewChild, ElementRef, effect, Injector, inject, AfterViewInit, OnDestroy,
} from '@angular/core';
import * as d3 from 'd3';
import { PulseMetricsResultGroup, PulseAgentCheckResultDetail } from '../../../../models/pulse-detail.model';
import { DateRange } from '../../../../components/date-range-selector/date-range-selector.component';

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
      this.renderChart(this.cpuRef.nativeElement, this.cpuTooltipRef?.nativeElement, data, 'CPU', '%', '#0d6efd');
    }
    if (this.hasMemory() && this.memRef) {
      const data = this.buildBuckets(items, 'memory', dec, pct);
      this.renderChart(this.memRef.nativeElement, this.memTooltipRef?.nativeElement, data, 'Memory', '%', '#6f42c1');
    }
    if (this.hasIo() && this.ioRef) {
      const data = this.buildBuckets(items, 'io', dec, pct);
      this.renderChart(this.ioRef.nativeElement, this.ioTooltipRef?.nativeElement, data, 'I/O', 'MB/s', '#20c997');
    }
  }

  private renderChart(
    svgEl: SVGSVGElement,
    tooltipEl: HTMLDivElement | undefined,
    data: MetricBucket[],
    seriesName: string,
    yLabel: string,
    color: string,
  ): void {
    const container = svgEl.parentElement!;
    const totalWidth = container.clientWidth || 400;
    const totalHeight = 200;

    const margin = { top: 8, right: 16, bottom: 42, left: 50 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', totalWidth).attr('height', totalHeight);
    svg.selectAll('*').remove();

    const clipId = `clip-${color.replace('#', '')}`;
    svg.append('defs').append('clipPath').attr('id', clipId)
      .append('rect').attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    if (!data.length) return;

    const xExtent = d3.extent(data, (d) => d.timestamp) as [number, number];
    const xScale = d3.scaleTime().domain(xExtent).range([0, width]);
    const yMax = yLabel === '%' ? 100 : (d3.max(data, (d) => d.value) ?? 0) * 1.1;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height, 0]).nice();

    const xAxisG = g.append('g').attr('transform', `translate(0,${height})`);

    const applyXAxis = (xSc: d3.ScaleTime<number, number>) => {
      const [d0, d1] = xSc.domain() as [Date, Date];
      const s = d1.getTime() - d0.getTime();
      const fmt = s > 7 * 86400000 ? d3.timeFormat('%b %d') :
                  s > 86400000     ? d3.timeFormat('%b %d') :
                                     d3.timeFormat('%H:%M');
      xAxisG.call(d3.axisBottom(xSc).ticks(6).tickFormat(fmt as any));
      if (s > 86400000 && s <= 7 * 86400000) {
        xAxisG.selectAll<SVGTextElement, Date>('.tick text').each(function(d) {
          d3.select(this).append('tspan').attr('x', 0).attr('dy', '1.2em')
            .text(d3.timeFormat('%H:%M')(d));
        });
      }
    };

    applyXAxis(xScale);
    g.append('g').call(
      d3.axisLeft(yScale).ticks(5).tickFormat((v) =>
        yLabel === 'MB/s' ? `${(v as number).toFixed(1)}` : `${v as number}%`,
      ),
    );

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
      .attr('fill', color + '33')
      .attr('d', area);
    plotG.append('path').datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Redraw helper
    const redrawPaths = (xSc: d3.ScaleTime<number, number>) => {
      applyXAxis(xSc);
      plotG.selectAll('path').remove();
      const rArea = d3.area<MetricBucket>()
        .x((d) => xSc(d.timestamp)).y0(height).y1((d) => yScale(d.value))
        .curve(d3.curveCatmullRom.alpha(0.1));
      const rLine = d3.line<MetricBucket>()
        .x((d) => xSc(d.timestamp)).y((d) => yScale(d.value))
        .curve(d3.curveCatmullRom.alpha(0.1));
      plotG.insert('path', ':first-child').datum(data)
        .attr('fill', color + '33').attr('d', rArea);
      plotG.insert('path', ':nth-child(2)').datum(data)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5).attr('d', rLine);
    };

    let currentXScale = xScale;

    // Brush-to-zoom
    const brushG = plotG.append('g').attr('class', 'brush');
    const brush = d3.brushX()
      .extent([[0, 0], [width, height]])
      .on('end', (event) => {
        if (!event.selection) return;
        const [x0, x1] = event.selection as [number, number];
        if (Math.abs(x1 - x0) < 4) { brushG.call(brush.move, null); return; }
        const newDomain: [Date, Date] = [currentXScale.invert(x0), currentXScale.invert(x1)];
        currentXScale = xScale.copy().domain(newDomain);
        brushG.call(brush.move, null);
        redrawPaths(currentXScale);
      });

    brushG.call(brush);
    brushG.select('.selection')
      .attr('fill', 'rgba(13,110,253,0.15)')
      .attr('stroke', 'rgba(13,110,253,0.5)')
      .attr('stroke-width', 1);

    // Tooltip via brush overlay
    if (tooltipEl) {
      const bisect = d3.bisector<MetricBucket, number>((d) => d.timestamp).left;
      const tooltip = d3.select(tooltipEl);

      const vline = plotG.insert('line', '.brush')
        .attr('stroke', '#999').attr('stroke-width', 1).attr('stroke-dasharray', '3,3')
        .attr('y1', 0).attr('y2', height).style('opacity', 0);

      brushG.select<SVGRectElement>('.overlay')
        .on('mousemove', (event) => {
          const [mx] = d3.pointer(event);
          const t = currentXScale.invert(mx).getTime();
          const idx = Math.min(bisect(data, t, 1), data.length - 1);
          const pt = data[idx];
          vline.attr('x1', currentXScale(pt.timestamp)).attr('x2', currentXScale(pt.timestamp)).style('opacity', 1);
          const val = yLabel === 'MB/s' ? `${pt.value.toFixed(2)} MB/s` : `${pt.value.toFixed(1)}%`;
          const ts = new Date(pt.timestamp).toLocaleString();
          tooltip
            .style('opacity', '1')
            .style('left', `${event.offsetX + 12}px`)
            .style('top', `${event.offsetY - 10}px`)
            .html(`<div class="tt-date">${ts}</div><div class="tt-row"><span class="tt-swatch" style="background:${color}"></span><span class="tt-label">${seriesName}:</span> <span class="tt-value">${val}</span></div>`);
        })
        .on('mouseout', () => {
          vline.style('opacity', 0);
          tooltip.style('opacity', '0');
        });
    }

    // Ctrl+wheel zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 200])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .filter((event) => event.type === 'wheel' && event.ctrlKey)
      .on('zoom', (event) => {
        currentXScale = event.transform.rescaleX(xScale);
        redrawPaths(currentXScale);
      });

    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      currentXScale = xScale;
      redrawPaths(currentXScale);
      svg.call(zoom.transform, d3.zoomIdentity);
    });
  }

  private buildBuckets(
    items: PulseAgentCheckResultDetail[],
    metric: 'cpu' | 'memory' | 'io',
    dec: number,
    pct: number,
  ): MetricBucket[] {
    const bucketMs = dec * 60 * 1000;
    const map = new Map<number, number[]>();
    for (const item of items) {
      const raw = metric === 'cpu' ? item.cpu : metric === 'memory' ? item.memory : item.inputOutput;
      if (raw == null) continue;
      const key = Math.floor(item.timestamp / bucketMs) * bucketMs;
      const arr = map.get(key) ?? [];
      arr.push(raw);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, values]) => {
        let v: number;
        if (pct === 0) v = values.reduce((s, x) => s + x, 0) / values.length;
        else {
          const sv = [...values].sort((a, z) => a - z);
          v = sv[Math.max(0, Math.ceil((pct / 100) * sv.length) - 1)];
        }
        if (metric === 'io') v = v / 1024 / 1024;
        return { timestamp, value: v };
      });
  }
}
