import { Component, ChangeDetectionStrategy, OnInit, DestroyRef, inject, computed, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { OVERVIEW_REFRESH_INTERVAL_S, TWELVE_HOURS_MS } from '../../constants';
import { PulseService } from '../../services/pulse.service';
import { PulseOverviewGroupItem } from '../../models/pulse-overview.model';
import { PulseStates, STATE_BORDER_VARS, STATE_LABELS } from '../../models/pulse-states.enum';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner.component';
import { TimeAgoPipe } from '../../pipes/time-ago.pipe';
import { computeUptime } from '../../utils/uptime.util';

interface TimelineSegment {
  widthPercent: number;
  color: string;
  state: PulseStates;
  duration: string;
  start: string;
  end: string;
}

interface OverviewCard {
  id: string;
  name: string;
  state: PulseStates;
  stateLabel: string;
  message: string | undefined;
  to: string | undefined;
  isHealthy: boolean;
  borderColor: string;
  cardBackground: string;
  incidentCount: number;
  degradedCount: number;
  uptimePercent: number;
  timelineSegments: TimelineSegment[];
}

interface OverviewSection {
  group: string;
  cards: OverviewCard[];
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterLink, DecimalPipe, NgbTooltip, StatusBadgeComponent, LoadingSpinnerComponent, TimeAgoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  private readonly pulseService = inject(PulseService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = this.pulseService.loading;
  readonly secondsUntilRefresh = signal(OVERVIEW_REFRESH_INTERVAL_S);
  readonly compact = signal(false);
  readonly activeSegment = signal<{ segment: TimelineSegment; x: number; y: number } | null>(null);

  @ViewChild('segTooltipEl') private segTooltipEl?: ElementRef<HTMLDivElement>;

  readonly sections = computed<OverviewSection[]>(() =>
    this.pulseService.overview().map((group) => ({
      group: group.group,
      cards: group.items.map((item) => this.#buildCard(item)),
    })),
  );

  ngOnInit(): void {
    this.pulseService.loadOverview();

    const countdown = setInterval(() => {
      this.secondsUntilRefresh.update((s) => (s > 0 ? s - 1 : 0));
    }, 1_000);

    const refresh = setInterval(() => {
      this.pulseService.loadOverview();
      this.secondsUntilRefresh.set(OVERVIEW_REFRESH_INTERVAL_S);
    }, OVERVIEW_REFRESH_INTERVAL_S * 1_000);

    this.destroyRef.onDestroy(() => {
      clearInterval(countdown);
      clearInterval(refresh);
    });
  }

  onSegmentHover(event: MouseEvent, segment: TimelineSegment): void {
    const margin = 8;
    const el = this.segTooltipEl?.nativeElement;
    const w = el?.offsetWidth ?? 160;
    const h = el?.offsetHeight ?? 90;

    let x = event.clientX + 14;
    let y = event.clientY - 10;

    if (x + w + margin > window.innerWidth)  { x = event.clientX - w - 14; }
    if (y + h + margin > window.innerHeight) { y = event.clientY - h - 10; }
    x = Math.max(margin, x);
    y = Math.max(margin, y);

    this.activeSegment.set({ segment, x, y });
  }

  onSegmentLeave(): void {
    this.activeSegment.set(null);
  }

  #buildCard(item: PulseOverviewGroupItem): OverviewCard {
    const latest = item.items[0];
    const state = latest?.state ?? PulseStates.Unknown;
    const isHealthy = state === PulseStates.Healthy;

    return {
      id: item.id,
      name: item.name,
      state,
      stateLabel: STATE_LABELS[state],
      message: latest?.message,
      to: latest?.to,
      isHealthy,
      borderColor: STATE_BORDER_VARS[state],
      cardBackground: isHealthy ? 'transparent' : `color-mix(in srgb, ${STATE_BORDER_VARS[state]} 6%, transparent)`,
      incidentCount: item.items.filter(
        (i) => i.state === PulseStates.Unhealthy || i.state === PulseStates.TimedOut,
      ).length,
      degradedCount: item.items.filter((i) => i.state === PulseStates.Degraded).length,
      uptimePercent: computeUptime(item.items),
      timelineSegments: this.#buildTimeline(item),
    };
  }

  #buildTimeline(item: PulseOverviewGroupItem): TimelineSegment[] {
    if (!item.items || item.items.length === 0) return [];

    const firstItem = item.items[0];
    const latest = firstItem.to ? new Date(firstItem.to).getTime() : null;
    if (!latest) return [];

    const cutoff = latest - TWELVE_HOURS_MS;
    const totalSpan = latest - cutoff; // fixed 12-hour window

    // Reverse so oldest is first (left → right chronological order),
    // drop segments entirely before the cutoff, clip the first crossing segment
    const segments = [...item.items]
      .reverse()
      .filter((m) => m.from && m.to && new Date(m.to!).getTime() > cutoff)
      .map((m) => {
        const clippedFrom = Math.max(new Date(m.from!).getTime(), cutoff);
        const actualFrom = new Date(m.from!).getTime();
        const to = new Date(m.to!).getTime();
        const visibleMs = to - clippedFrom;
        const fullMs = to - actualFrom;
        return {
          widthPercent: Math.max(1, (visibleMs / totalSpan) * 100),
          color: STATE_BORDER_VARS[m.state],
          state: m.state,
          duration: this.#formatDuration(fullMs),
          start: this.#formatDate(actualFrom),
          end: this.#formatDate(to),
        };
      });

    // Normalize so segments always sum to exactly 100%,
    // preventing min-width enforcement from pushing tail segments off the bar
    const total = segments.reduce((sum, s) => sum + s.widthPercent, 0);
    if (total > 100) {
      const scale = 100 / total;
      segments.forEach((s) => (s.widthPercent *= scale));
    }

    return segments;
  }

  #formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    return `${seconds}s`;
  }

  #formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${d.getDate()} ${months[d.getMonth()]} ${h}:${m}`;
  }
}
