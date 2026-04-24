import { Injectable, signal, NgZone } from '@angular/core';
import { PulseEventInfo } from '../models/pulse-event.model';
import { MAX_EVENT_BUFFER } from '../constants';

@Injectable({ providedIn: 'root' })
export class EventService {
  private eventSource: EventSource | null = null;
  readonly events = signal<PulseEventInfo[]>([]);
  readonly connected = signal(false);

  constructor(private readonly zone: NgZone) {}

  connect(url: string): void {
    this.disconnect();
    this.events.set([]);

    this.zone.runOutsideAngular(() => {
      this.eventSource = new EventSource(url);
      this.eventSource.onopen = () => {
        this.zone.run(() => this.connected.set(true));
      };
      this.eventSource.onmessage = (event) => {
        const data: PulseEventInfo = JSON.parse(event.data);
        this.zone.run(() => {
          this.events.update((list) => {
            const updated = [...list, data];
            return updated.length > MAX_EVENT_BUFFER ? updated.slice(-MAX_EVENT_BUFFER) : updated;
          });
        });
      };
      this.eventSource.onerror = () => {
        this.zone.run(() => this.connected.set(false));
      };
    });
  }

  connectAll(): void {
    this.connect('api/1.0/pulses/events');
  }

  connectApplication(id: string): void {
    this.connect(`api/1.0/pulses/events/application/${encodeURIComponent(id)}`);
  }

  connectGroup(group: string): void {
    this.connect(`api/1.0/pulses/events/group/${encodeURIComponent(group)}`);
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected.set(false);
  }
}
