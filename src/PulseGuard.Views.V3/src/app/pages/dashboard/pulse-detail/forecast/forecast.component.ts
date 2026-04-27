import {
  Component, ChangeDetectionStrategy, input, output, signal,
  ViewChild, ElementRef, effect, Injector, inject, AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as d3 from 'd3';
import { PulseCheckResultDetail } from '../../../../models/pulse-detail.model';
import { PulseStates, STATE_COLORS } from '../../../../models/pulse-states.enum';

interface ForecastParams {
  historicalDays: number;
  forecastPeriods: number;
  maxLags: number;
  volatilityScale: number;
  patternStrength: number;
}

interface HourlyProb {
  timestamp: number;
  states: Record<string, number>;
}

interface ForecastSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forecast.component.html',
  styleUrl: './forecast.component.css',
})
export class ForecastComponent implements AfterViewInit {
  readonly items = input.required<PulseCheckResultDetail[]>();
  readonly archivedLoading = input(false);
  readonly close = output<void>();

  readonly params = signal<ForecastParams>({
    historicalDays: 30,
    forecastPeriods: 7,
    maxLags: 24,
    volatilityScale: 1.0,
    patternStrength: 0.5,
  });

  @ViewChild('forecastChart') chartRef!: ElementRef<SVGSVGElement>;

  private readonly injector = inject(Injector);

  readonly generating = signal(false);
  readonly error = signal<string | null>(null);
  readonly logMessages = signal<string[]>([]);
  readonly showResults = signal(false);
  readonly chartSeries = signal<ForecastSeries[]>([]);
  readonly forecastStats = signal<{ state: string; histStd: string; forecastStd: string; change: string }[]>([]);

  ngAfterViewInit(): void {
    effect(() => {
      if (this.showResults()) {
        this.chartSeries();
        // Defer one tick so @if block has mounted the SVG
        Promise.resolve().then(() => this.renderChart());
      }
    }, { injector: this.injector });
  }

  private renderChart(): void {
    const svgEl = this.chartRef?.nativeElement;
    if (!svgEl) return;
    const series = this.chartSeries();
    if (!series.length) return;

    const container = svgEl.parentElement!;
    const totalWidth = container.clientWidth || 600;
    const totalHeight = 400;
    const margin = { top: 10, right: 20, bottom: 30, left: 45 };
    const width = totalWidth - margin.left - margin.right;
    const height = totalHeight - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', totalWidth).attr('height', totalHeight);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const allPoints = series.flatMap((s) => s.points);
    const xExtent = d3.extent(allPoints, (p) => p.x) as [number, number];
    const xScale = d3.scaleTime().domain(xExtent).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    svg.append('defs').append('clipPath').attr('id', 'forecast-clip')
      .append('rect').attr('width', width).attr('height', height);

    const xAxisG = g.append('g').attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.timeFormat('%b %d') as any));
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat((v) => `${v}%`));

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -38).attr('x', -height / 2)
      .attr('text-anchor', 'middle').attr('font-size', '10px')
      .text('%');

    const plotG = g.append('g').attr('clip-path', 'url(#forecast-clip)');

    const drawLines = (xSc: d3.ScaleTime<number, number>) => {
      const lg = d3.line<{ x: number; y: number }>()
        .x((p) => xSc(p.x)).y((p) => yScale(p.y))
        .curve(d3.curveCatmullRom.alpha(0.1));
      plotG.selectAll('path').remove();
      for (const s of series) {
        plotG.append('path').datum(s.points)
          .attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', 1.5).attr('d', lg);
      }
    };

    drawLines(xScale);

    let currentXScale = xScale;

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
        xAxisG.call(d3.axisBottom(currentXScale).ticks(8).tickFormat(d3.timeFormat('%b %d') as any));
        drawLines(currentXScale);
      });

    brushG.call(brush);
    brushG.select('.selection')
      .attr('fill', 'rgba(13,110,253,0.15)')
      .attr('stroke', 'rgba(13,110,253,0.5)')
      .attr('stroke-width', 1);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 200])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .filter((event) => event.type === 'wheel' && event.ctrlKey)
      .on('zoom', (event) => {
        currentXScale = event.transform.rescaleX(xScale);
        xAxisG.call(d3.axisBottom(currentXScale).ticks(8).tickFormat(d3.timeFormat('%b %d') as any));
        drawLines(currentXScale);
      });

    svg.call(zoom);
    svg.on('dblclick.zoom', null);
    svg.on('dblclick', () => {
      currentXScale = xScale;
      xAxisG.call(d3.axisBottom(currentXScale).ticks(8).tickFormat(d3.timeFormat('%b %d') as any));
      drawLines(currentXScale);
      svg.call(zoom.transform, d3.zoomIdentity);
    });
  }

  onClose(): void {
    this.close.emit();
  }

  updateParam(key: keyof ForecastParams, value: number): void {
    this.params.update((p) => ({ ...p, [key]: value }));
  }

  async generate(): Promise<void> {
    this.generating.set(true);
    this.error.set(null);
    this.logMessages.set([]);
    this.showResults.set(false);

    try {
      const data = this.items();
      const p = this.params();

      this.log('Starting forecast generation...');

      const records = data
        .map((item) => ({ timestamp: item.timestamp, state: item.state }))
        .filter((r) => !isNaN(r.timestamp) && r.timestamp > 0);

      this.log(`Processed ${records.length} valid records`);
      if (records.length === 0) throw new Error('No valid data records found');

      const maxTime = records.reduce((max, r) => r.timestamp > max ? r.timestamp : max, records[0].timestamp);
      const cutoff = maxTime - p.historicalDays * 24 * 60 * 60 * 1000;
      const recent = records.filter((r) => r.timestamp >= cutoff);

      this.log(`Using last ${p.historicalDays} days: ${recent.length} records`);

      const stateProbs = this.calculateStateProbabilities(recent);
      this.log(`Calculated ${stateProbs.length} hourly probabilities`);

      if (stateProbs.length < 48) throw new Error(`Need at least 48 hours of data, have ${stateProbs.length}`);

      const statesSet = new Set<string>();
      for (const sp of stateProbs) {
        for (const s of Object.keys(sp.states)) statesSet.add(s);
      }
      const states = Array.from(statesSet).sort();

      const dataMatrix = stateProbs.map((sp) => states.map((s) => sp.states[s] || 0));

      // Optimal lag via AIC
      const optimalLag = this.selectOptimalLag(dataMatrix, p.maxLags);
      this.log(`Optimal lag: ${optimalLag}`);

      // Fit and forecast
      const forecast = this.fitAndForecast(dataMatrix, optimalLag, p.forecastPeriods * 24);

      // Enhance with volatility
      const enhanced = this.enhanceWithVolatility(forecast, stateProbs, states, p.volatilityScale, p.patternStrength);

      // Build chart
      const lastTimestamp = stateProbs[stateProbs.length - 1].timestamp;
      this.buildChart(stateProbs, enhanced, states, lastTimestamp);
      this.buildStats(stateProbs, enhanced, states);

      this.showResults.set(true);
      this.log('Forecast complete!');
    } catch (e: any) {
      this.error.set(e.message ?? 'Unknown error');
    } finally {
      this.generating.set(false);
    }
  }

  private log(msg: string): void {
    this.logMessages.update((msgs) => [...msgs, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  private calculateStateProbabilities(records: { timestamp: number; state: PulseStates }[]): HourlyProb[] {
    const hourlyGroups = new Map<number, string[]>();

    for (const r of records) {
      const d = new Date(r.timestamp);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
      const group = hourlyGroups.get(key) ?? [];
      group.push(r.state);
      hourlyGroups.set(key, group);
    }

    const result: HourlyProb[] = [];
    const sortedKeys = Array.from(hourlyGroups.keys()).sort((a, b) => a - b);

    for (const key of sortedKeys) {
      const states = hourlyGroups.get(key)!;
      const total = states.length;
      const counts: Record<string, number> = {};
      for (const s of states) counts[s] = (counts[s] ?? 0) + 1;
      const stateProb: Record<string, number> = {};
      for (const [s, c] of Object.entries(counts)) stateProb[s] = (c / total) * 100;
      result.push({ timestamp: key, states: stateProb });
    }

    return result;
  }

  private selectOptimalLag(dataMatrix: number[][], maxLags: number): number {
    const maxTest = Math.min(maxLags, Math.floor(dataMatrix.length / 10));
    let bestAIC = Infinity;
    let bestLag = 1;

    for (let lag = 1; lag <= maxTest; lag++) {
      const aic = this.calculateAIC(dataMatrix, lag);
      if (aic < bestAIC) {
        bestAIC = aic;
        bestLag = lag;
      }
    }
    return bestLag;
  }

  private calculateAIC(data: number[][], lagOrder: number): number {
    const T = data.length - lagOrder;
    const k = data[0].length;
    const numParams = k * k * lagOrder + k;
    let rss = 0;

    for (let t = lagOrder; t < data.length; t++) {
      for (let i = 0; i < k; i++) {
        let pred = 0;
        for (let lag = 0; lag < lagOrder; lag++) {
          pred += data[t - 1 - lag][i];
        }
        pred /= lagOrder;
        rss += Math.pow(data[t][i] - pred, 2);
      }
    }

    return T * Math.log(rss / T) + 2 * numParams;
  }

  private fitAndForecast(data: number[][], lagOrder: number, periods: number): number[][] {
    // Simple persistence-based forecast with lag averaging
    const forecast: number[][] = [];
    const history = data.map((row) => [...row]);
    const k = data[0].length;

    for (let t = 0; t < periods; t++) {
      const pred = new Array(k).fill(0);
      for (let lag = 0; lag < lagOrder; lag++) {
        const idx = history.length - 1 - lag;
        if (idx < 0) continue;
        for (let j = 0; j < k; j++) {
          pred[j] += history[idx][j] / lagOrder;
        }
      }

      // Clamp and normalize
      const clamped = pred.map((v) => Math.max(0, Math.min(100, v)));
      const sum = clamped.reduce((a, b) => a + b, 0);
      const normalized = sum > 0 ? clamped.map((v) => (v / sum) * 100) : clamped;

      forecast.push(normalized);
      history.push([...normalized]);
    }

    return forecast;
  }

  private enhanceWithVolatility(
    forecast: number[][], historical: HourlyProb[], states: string[],
    volatilityScale: number, patternStrength: number
  ): number[][] {
    const enhanced = forecast.map((row) => [...row]);
    const recent = historical.slice(-7 * 24);

    const volatilities = states.map((state, idx) => {
      const vals = recent.map((sp) => sp.states[state] || 0);
      return this.standardDeviation(vals);
    });

    let prevNoise = new Array(states.length).fill(0);

    for (let i = 0; i < enhanced.length; i++) {
      const decay = Math.exp(-i / (enhanced.length * 1.5));

      for (let j = 0; j < states.length; j++) {
        const noise = i === 0
          ? this.randomNormal() * volatilities[j] * volatilityScale * 0.15
          : 0.7 * prevNoise[j] + 0.3 * this.randomNormal() * volatilities[j] * volatilityScale * 0.15;

        enhanced[i][j] += noise * decay;
        enhanced[i][j] = Math.max(0, Math.min(100, enhanced[i][j]));
        prevNoise[j] = enhanced[i][j] - forecast[i][j];
      }

      const sum = enhanced[i].reduce((a, b) => a + b, 0);
      if (sum > 120 || sum < 80) {
        const factor = 100 / sum;
        enhanced[i] = enhanced[i].map((v) => Math.max(0, Math.min(100, v * factor)));
      }
    }

    return enhanced;
  }

  private buildChart(historical: HourlyProb[], forecast: number[][], states: string[], lastTimestamp: number): void {
    const series: ForecastSeries[] = states.map((state, idx) => {
      const color = (STATE_COLORS as Record<string, string>)[state] ?? '#6c757d';
      const histPoints = historical.map((h) => ({ x: h.timestamp, y: h.states[state] || 0 }));
      const forePoints = forecast.map((f, i) => ({ x: lastTimestamp + (i + 1) * 3600000, y: f[idx] }));
      return { label: state, color, points: [...histPoints, ...forePoints] };
    });
    this.chartSeries.set(series);
  }

  private buildStats(historical: HourlyProb[], forecast: number[][], states: string[]): void {
    const stats = states.map((state, idx) => {
      const histVals = historical.map((h) => h.states[state] || 0);
      const foreVals = forecast.map((f) => f[idx]);
      const histStd = this.standardDeviation(histVals);
      const foreStd = this.standardDeviation(foreVals);
      const change = histStd > 0 ? ((foreStd - histStd) / histStd * 100).toFixed(1) : 'N/A';

      return { state, histStd: histStd.toFixed(2), forecastStd: foreStd.toFixed(2), change: typeof change === 'string' ? change : `${change}%` };
    });

    this.forecastStats.set(stats);
  }

  private standardDeviation(values: number[]): number {
    if (!values.length) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private randomNormal(): number {
    const u1 = 1.0 - Math.random();
    const u2 = 1.0 - Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
  }
}
