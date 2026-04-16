import { Injectable } from '@angular/core';
import * as protobuf from 'protobufjs';
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
    const reader = new protobuf.Reader(new Uint8Array(buffer));
    let group = '';
    let name = '';
    const items: PulseCheckResultDetail[] = [];

    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: group = reader.string(); break;
        case 2: name = reader.string(); break;
        case 3: {
          // Group-delimited sub-message (DataFormat.Group)
          const item = this.decodePulseCheckResultDetail(reader);
          items.push(item);
          break;
        }
        default: reader.skipType(tag & 7); break;
      }
    }
    return { group, name, items };
  }

  private decodePulseCheckResultDetail(reader: protobuf.Reader): PulseCheckResultDetail {
    let state = PulseStates.Unknown;
    let timestamp = 0;
    let elapsedMilliseconds: number | undefined;

    // Read until end-group tag or end of reader
    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      if ((tag & 7) === 4) break; // end group marker

      switch (tag >>> 3) {
        case 1: state = STATE_MAP[reader.int32()] ?? PulseStates.Unknown; break;
        case 2: timestamp = Number(reader.int64()); break;
        case 3: elapsedMilliseconds = Number(reader.int64()); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return { state, timestamp, elapsedMilliseconds };
  }

  decodeMetrics(buffer: ArrayBuffer): PulseMetricsResultGroup {
    const reader = new protobuf.Reader(new Uint8Array(buffer));
    const items: PulseAgentCheckResultDetail[] = [];

    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: {
          const item = this.decodeMetricDetail(reader);
          items.push(item);
          break;
        }
        default: reader.skipType(tag & 7); break;
      }
    }
    return { items };
  }

  private decodeMetricDetail(reader: protobuf.Reader): PulseAgentCheckResultDetail {
    let timestamp = 0;
    let cpu: number | undefined;
    let memory: number | undefined;
    let inputOutput: number | undefined;

    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      if ((tag & 7) === 4) break;

      switch (tag >>> 3) {
        case 1: timestamp = Number(reader.int64()); break;
        case 2: cpu = reader.double(); break;
        case 3: memory = reader.double(); break;
        case 4: inputOutput = reader.double(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return { timestamp, cpu, memory, inputOutput };
  }

  decodeHeatmaps(buffer: ArrayBuffer): PulseHeatmaps {
    const reader = new protobuf.Reader(new Uint8Array(buffer));
    let id = '';
    const items: PulseHeatmap[] = [];

    while (reader.pos < reader.len) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: id = reader.string(); break;
        case 2: {
          const item = this.decodeHeatmapItem(reader, reader.uint32());
          items.push(item);
          break;
        }
        default: reader.skipType(tag & 7); break;
      }
    }
    return { id, items };
  }

  private decodeHeatmapItem(reader: protobuf.Reader, length: number): PulseHeatmap {
    const end = reader.pos + length;
    let day = '';
    let unknown = 0, healthy = 0, degraded = 0, unhealthy = 0, timedOut = 0;

    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: day = reader.string(); break;
        case 2: unknown = reader.int32(); break;
        case 3: healthy = reader.int32(); break;
        case 4: degraded = reader.int32(); break;
        case 5: unhealthy = reader.int32(); break;
        case 6: timedOut = reader.int32(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return { day, unknown, healthy, degraded, unhealthy, timedOut };
  }
}
