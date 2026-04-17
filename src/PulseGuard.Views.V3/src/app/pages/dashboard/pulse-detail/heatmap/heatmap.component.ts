import {
  Component, ChangeDetectionStrategy, input, output, signal,
  Injector, inject, AfterViewInit, ViewChild, ElementRef, OnDestroy,
} from '@angular/core';
import { PulseHeatmaps, PulseHeatmap } from '../../../../models/pulse-heatmap.model';
import { PulseDeployment } from '../../../../models/pulse-overview.model';
import { effect } from '@angular/core';

interface DayStats {
  state: string;
  intensity: number;
  hasDeployment: boolean;
  tooltipLines: string[];
}

interface CellHit {
  x: number;
  y: number;
  dayKey: string;
  tooltipLines: string[];
}

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.css',
})
export class HeatmapComponent implements AfterViewInit, OnDestroy {
  readonly data = input.required<PulseHeatmaps>();
  readonly deployments = input<PulseDeployment[]>([]);

  @ViewChild('heatmapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly tooltipVisible = signal(false);
  readonly tooltipX = signal(0);
  readonly tooltipY = signal(0);
  readonly tooltipLines = signal<string[]>([]);
  readonly dayClicked = output<string>();

  private readonly CELL_SIZE = 12;
  private readonly CELL_GAP = 2;
  private readonly CELL_RADIUS = 5;
  private readonly LEFT_AXIS = 36;
  private readonly TOP_AXIS = 18;

  private hitMap: CellHit[] = [];
  private themeObserver: MutationObserver | null = null;

  private readonly injector = inject(Injector);

  ngAfterViewInit(): void {
    effect(() => {
      this.data();
      this.deployments();
      this.drawCanvas();
    }, { injector: this.injector });

    // Redraw when theme changes (data-bs-theme attribute)
    this.themeObserver = new MutationObserver(() => this.drawCanvas());
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });
  }

  ngOnDestroy(): void {
    this.themeObserver?.disconnect();
  }

  onMouseMove(event: MouseEvent): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (event.clientX - rect.left) * scaleX;
    const my = (event.clientY - rect.top) * scaleY;

    const cs = this.CELL_SIZE;
    const cg = this.CELL_GAP;
    const hit = this.hitMap.find(h => mx >= h.x && mx <= h.x + cs + cg && my >= h.y && my <= h.y + cs + cg);

    if (hit) {
      this.tooltipLines.set(hit.tooltipLines);
      // Use fixed positioning relative to viewport to avoid overflow/scrollbar issues
      this.tooltipX.set(event.clientX + 14);
      this.tooltipY.set(event.clientY - 10);
      this.tooltipVisible.set(true);
    } else {
      this.tooltipVisible.set(false);
    }
  }

  onMouseLeave(): void {
    this.tooltipVisible.set(false);
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (event.clientX - rect.left) * scaleX;
    const my = (event.clientY - rect.top) * scaleY;

    const cs = this.CELL_SIZE;
    const cg = this.CELL_GAP;
    const hit = this.hitMap.find(h => mx >= h.x && mx <= h.x + cs + cg && my >= h.y && my <= h.y + cs + cg);
    if (hit) {
      this.dayClicked.emit(hit.dayKey);
    }
  }

  private drawCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const data = this.data();
    const deploys = this.deployments();

    // Build deployment lookup
    const deploymentsByDay = new Map<string, number>();
    for (const d of deploys) {
      const date = new Date(d.from);
      date.setUTCHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      deploymentsByDay.set(key, (deploymentsByDay.get(key) ?? 0) + 1);
    }

    // Build data lookup
    const dayBuckets = new Map<string, PulseHeatmap>();
    if (data?.items) {
      for (const item of data.items) {
        const key = `${item.day.slice(0, 4)}-${item.day.slice(4, 6)}-${item.day.slice(6, 8)}`;
        dayBuckets.set(key, item);
      }
    }

    // Build weeks array (52 weeks back from last Monday → today)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dow = today.getUTCDay();
    const daysSinceMonday = (dow + 6) % 7;
    const lastMonday = new Date(today);
    lastMonday.setUTCDate(today.getUTCDate() - daysSinceMonday);
    const startDate = new Date(lastMonday);
    startDate.setUTCDate(lastMonday.getUTCDate() - 7 * 52);

    const days: Date[] = [];
    for (const d = new Date(startDate); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(new Date(d));
    }
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    // Pad last week with nulls
    const last = weeks[weeks.length - 1];
    while (last.length < 7) last.push(null);

    // Canvas dimensions
    const S = this.CELL_SIZE, G = this.CELL_GAP, R = this.CELL_RADIUS;
    const LA = this.LEFT_AXIS, TA = this.TOP_AXIS;
    const weekCount = weeks.length;
    canvas.width = LA + weekCount * (S + G) + G;
    canvas.height = TA + 7 * (S + G) + G;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cs = getComputedStyle(document.body);
    const strokeStyle = cs.getPropertyValue('--bs-secondary-border-subtle').trim() || '#dee2e6';
    const labelColor = cs.getPropertyValue('--bs-secondary-color').trim() || '#888';
    const font = '10px sans-serif';

    // Y axis — day labels (Mon = 0)
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = labelColor;
    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let d = 0; d < 7; d += 2) {  // every other day to avoid crowding
      ctx.fillText(DAY_LABELS[d], LA - 4, TA + d * (S + G) + S / 2);
    }
    ctx.restore();

    // X axis — month labels (show on first week of each month)
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = labelColor;
    let lastMonth = -1;
    for (let w = 0; w < weekCount; w++) {
      const firstDay = weeks[w][0];
      if (!firstDay) continue;
      const m = firstDay.getUTCMonth();
      if (m !== lastMonth) {
        ctx.fillText(firstDay.toLocaleDateString(undefined, { month: 'short' }), LA + w * (S + G), 2);
        lastMonth = m;
      }
    }
    ctx.restore();

    // Draw cells
    this.hitMap = [];
    for (let w = 0; w < weekCount; w++) {
      for (let d = 0; d < 7; d++) {
        const day = weeks[w][d];
        if (!day) continue;

        const dayKey = day.toISOString().slice(0, 10);
        const x = LA + w * (S + G) + G;
        const y = TA + d * (S + G) + G;

        const entry = dayBuckets.get(dayKey);
        const deployCount = deploymentsByDay.get(dayKey) ?? 0;
        const stats = this.computeDayStats(dayKey, entry, deployCount);

        // Determine fill color
        const [cssVar, fallback] = this.getStateColorVars(stats.state);
        const rgb = cs.getPropertyValue(cssVar).replace(/\s+/g, '') || fallback;
        const color = `rgba(${rgb},${stats.intensity})`;

        // Draw rounded rect
        const bw = 1;
        const inner = S - bw;
        const ir = Math.max(0, R - bw / 2);
        const o = bw / 2;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + o + ir, y + o);
        ctx.lineTo(x + o + inner - ir, y + o);
        ctx.quadraticCurveTo(x + o + inner, y + o, x + o + inner, y + o + ir);
        ctx.lineTo(x + o + inner, y + o + inner - ir);
        ctx.quadraticCurveTo(x + o + inner, y + o + inner, x + o + inner - ir, y + o + inner);
        ctx.lineTo(x + o + ir, y + o + inner);
        ctx.quadraticCurveTo(x + o, y + o + inner, x + o, y + o + inner - ir);
        ctx.lineTo(x + o, y + o + ir);
        ctx.quadraticCurveTo(x + o, y + o, x + o + ir, y + o);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = bw;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
        ctx.restore();

        // White dot in center for deployments
        if (stats.hasDeployment) {
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + S / 2, y + S / 2, 1.5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        }

        this.hitMap.push({ x, y, dayKey, tooltipLines: stats.tooltipLines });
      }
    }
  }

  private computeDayStats(dayKey: string, entry: PulseHeatmap | undefined, deployCount: number): DayStats {
    const hasDeployment = deployCount > 0;

    if (!entry) {
      const lines = [dayKey, 'No data'];
      if (hasDeployment) lines.push(`Deployed: ${deployCount} time${deployCount > 1 ? 's' : ''}`);
      return { state: 'Unknown', intensity: 1, hasDeployment, tooltipLines: lines };
    }

    const counts = {
      Healthy: entry.healthy,
      Degraded: entry.degraded,
      Unhealthy: entry.unhealthy,
      TimedOut: entry.timedOut,
      Unknown: entry.unknown,
    };
    const total = counts.Healthy + counts.Degraded + counts.Unhealthy + counts.TimedOut + counts.Unknown;

    if (total === 0) {
      const lines = [dayKey, 'No data'];
      if (hasDeployment) lines.push(`Deployed: ${deployCount} time${deployCount > 1 ? 's' : ''}`);
      return { state: 'Unknown', intensity: 1, hasDeployment, tooltipLines: lines };
    }

    const timedOutPct = counts.TimedOut / total;
    const unhealthyPct = counts.Unhealthy / total;
    const healthyPct = counts.Healthy / total;

    let state = 'Degraded';
    let intensity = 0.5;

    if (unhealthyPct >= timedOutPct && unhealthyPct >= 0.02) {
      state = 'Unhealthy';
      intensity = 0.33 + 0.67 * ((unhealthyPct - 0.02) / 0.13);
    } else if (timedOutPct >= 0.02) {
      state = 'TimedOut';
      intensity = 0.33 + 0.67 * ((timedOutPct - 0.02) / 0.13);
    } else if (healthyPct >= 0.98) {
      state = 'Healthy';
      intensity = 0.33 + 0.67 * ((healthyPct - 0.98) / 0.02);
    } else {
      intensity = 0.33 + 0.67 * (counts[state as keyof typeof counts] / total);
    }
    intensity = Math.max(0.33, Math.min(1, intensity));

    const lines: string[] = [`${dayKey}: ${state}`];
    for (const s of ['Healthy', 'Degraded', 'Unhealthy', 'TimedOut', 'Unknown'] as const) {
      if (counts[s]) lines.push(`${s}: ${counts[s]} (${((counts[s] / total) * 100).toFixed(2)}%)`);
    }
    if (hasDeployment) lines.push(`Deployed: ${deployCount} time${deployCount > 1 ? 's' : ''}`);

    return { state, intensity, hasDeployment, tooltipLines: lines };
  }

  private getStateColorVars(state: string): [string, string] {
    switch (state) {
      case 'Healthy':   return ['--bs-success-rgb', '25,135,84'];
      case 'Degraded':  return ['--bs-warning-rgb', '255,193,7'];
      case 'Unhealthy': return ['--bs-danger-rgb',  '220,53,69'];
      case 'TimedOut':  return ['--bs-pink-rgb',    '214,51,132'];
      default:          return ['--bs-secondary-rgb', '167,172,177'];
    }
  }
}
