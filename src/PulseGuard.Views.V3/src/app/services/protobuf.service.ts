import { Injectable } from '@angular/core';
import { BinaryReader, WireType } from '@protobuf-ts/runtime';
import { PulseCheckResultDetail, PulseDetailResultGroup, PulseAgentCheckResultDetail, PulseMetricsResultGroup } from '../models/pulse-detail.model';
import { PulseHeatmap, PulseHeatmaps } from '../models/pulse-heatmap.model';
import { PulseStates } from '../models/pulse-states.enum';

const STATE_MAP: Record<number, PulseStates> = {
  0: PulseStates.Unknown,
  1: PulseStates.Healthy,
  2: PulseStates.Degraded,
  3: PulseStates.Unhealthy,
  4: PulseStates.TimedOut,
};

@Injectable({ providedIn: 'root' })
export class ProtobufService {

  decodePulseDetails(buffer: ArrayBuffer): PulseDetailResultGroup {
    const reader = new BinaryReader(new Uint8Array(buffer));
    let group = '';
    let name = '';
    const items: PulseCheckResultDetail[] = [];

    while (reader.pos < reader.len) {
      const [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1: group = reader.string(); break;
        case 2: name = reader.string(); break;
        case 3: {
          const item = this.decodePulseCheckResultDetail(reader, reader.uint32());
          items.push(item);
          break;
        }
        default: reader.skip(wireType); break;
      }
    }
    return { group, name, items };
  }

  private decodePulseCheckResultDetail(reader: BinaryReader, length: number): PulseCheckResultDetail {
    const end = reader.pos + length;
    let state = PulseStates.Unknown;
    let timestamp = 0;
    let elapsedMilliseconds: number | undefined;

    while (reader.pos < end) {
      const [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1: state = STATE_MAP[reader.int32()] ?? PulseStates.Unknown; break;
        case 2: timestamp = reader.int64().toNumber() * 1000; break;
        case 3: elapsedMilliseconds = reader.int64().toNumber(); break;
        default: reader.skip(wireType); break;
      }
    }
    return { state, timestamp, elapsedMilliseconds };
  }

  decodeMetrics(buffer: ArrayBuffer): PulseMetricsResultGroup {
    const reader = new BinaryReader(new Uint8Array(buffer));
    const items: PulseAgentCheckResultDetail[] = [];

    while (reader.pos < reader.len) {
      const [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1: {
          const item = this.decodeMetricDetail(reader, reader.uint32());
          items.push(item);
          break;
        }
        default: reader.skip(wireType); break;
      }
    }
    return { items };
  }

  private decodeMetricDetail(reader: BinaryReader, length: number): PulseAgentCheckResultDetail {
    const end = reader.pos + length;
    let timestamp = 0;
    let cpu: number | undefined;
    let memory: number | undefined;
    let inputOutput: number | undefined;

    while (reader.pos < end) {
      const [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1: timestamp = reader.int64().toNumber() * 1000; break;
        case 2: cpu = reader.double(); break;
        case 3: memory = reader.double(); break;
        case 4: inputOutput = reader.double(); break;
        default: reader.skip(wireType); break;
      }
    }
    return { timestamp, cpu, memory, inputOutput };
  }

  decodeHeatmaps(buffer: ArrayBuffer): PulseHeatmaps {
    const reader = new BinaryReader(new Uint8Array(buffer));
    let id = '';
    const items: PulseHeatmap[] = [];

    while (reader.pos < reader.len) {
      const [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1: id = reader.string(); break;
        case 2: {
          const item = this.decodeHeatmapItem(reader, reader.uint32());
          items.push(item);
          break;
        }
        default: reader.skip(wireType); break;
      }
    }
    return { id, items };
  }

  private decodeHeatmapItem(reader: BinaryReader, length: number): PulseHeatmap {
    const end = reader.pos + length;
    let day = '';
    let unknown = 0, healthy = 0, degraded = 0, unhealthy = 0, timedOut = 0;

    while (reader.pos < end) {
      const [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case 1: day = reader.string(); break;
        case 2: unknown = reader.int32(); break;
        case 3: healthy = reader.int32(); break;
        case 4: degraded = reader.int32(); break;
        case 5: unhealthy = reader.int32(); break;
        case 6: timedOut = reader.int32(); break;
        default: reader.skip(wireType); break;
      }
    }
    return { day, unknown, healthy, degraded, unhealthy, timedOut };
  }
}
