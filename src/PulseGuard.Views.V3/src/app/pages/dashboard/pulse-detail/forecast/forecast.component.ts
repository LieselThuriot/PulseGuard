import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartConfiguration } from 'chart.js';
import 'chartjs-adapter-date-fns';
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

@Component({
  selector: 'app-forecast',
  standalone: true,
  imports: [FormsModule, BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forecast.component.html',
  styleUrl: './forecast.component.css',
})
export class ForecastComponent {
  readonly items = input.required<PulseCheckResultDetail[]>();
  readonly close = output<void>();

  readonly params = signal<ForecastParams>({
    historicalDays: 30,
    forecastPeriods: 7,
    maxLags: 24,
    volatilityScale: 1.0,
    patternStrength: 0.5,
  });

  readonly generating = signal(false);
  readonly error = signal<string | null>(null);
  readonly logMessages = signal<string[]>([]);
  readonly showResults = signal(false);

  readonly chartData = signal<ChartData<'line'>>({ labels: [], datasets: [] });
  readonly chartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MMM d' } } },
      y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } },
    },
    plugins: {
      legend: { display: true, position: 'top' as const },
    },
  };

  readonly forecastStats = signal<{ state: string; histStd: string; forecastStd: string; change: string }[]>([]);

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
        .map((item) => ({ timestamp: item.timestamp * 1000, state: item.state }))
        .filter((r) => !isNaN(r.timestamp) && r.timestamp > 0);

      this.log(`Processed ${records.length} valid records`);
      if (records.length === 0) throw new Error('No valid data records found');

      const maxTime = Math.max(...records.map((r) => r.timestamp));
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
    const histLabels = historical.map((h) => h.timestamp);
    const forecastLabels = forecast.map((_, i) => lastTimestamp + (i + 1) * 3600000);
    const allLabels = [...histLabels, ...forecastLabels];

    const datasets = states.map((state, idx) => {
      const histData = historical.map((h) => h.states[state] || 0);
      const forecastData = forecast.map((f) => f[idx]);
      const color = (STATE_COLORS as Record<string, string>)[state] ?? '#6c757d';

      return {
        label: state,
        data: [...histData, ...forecastData],
        borderColor: color,
        backgroundColor: color + '33',
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.3,
        borderDash: [...new Array(histData.length).fill(undefined), ...new Array(forecastData.length).fill(undefined)],
      };
    });

    this.chartData.set({ labels: allLabels, datasets });
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
