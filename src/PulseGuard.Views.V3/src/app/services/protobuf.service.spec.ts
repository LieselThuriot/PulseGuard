import { TestBed } from '@angular/core/testing';
import { BinaryWriter } from '@protobuf-ts/runtime';
import { ProtobufService } from './protobuf.service';
import { PulseStates } from '../models/pulse-states.enum';

describe('ProtobufService', () => {
  let service: ProtobufService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProtobufService);
  });

  describe('decodePulseDetails', () => {
    it('should decode an empty buffer to default values', () => {
      const result = service.decodePulseDetails(new ArrayBuffer(0));
      expect(result.group).toBe('');
      expect(result.name).toBe('');
      expect(result.items).toEqual([]);
    });

    it('should decode group and name fields', () => {
      const writer = new BinaryWriter();
      writer.tag(1, 2).string('MyGroup');
      writer.tag(2, 2).string('MyCheck');
      const buf = writer.finish();

      const result = service.decodePulseDetails(buf.buffer);
      expect(result.group).toBe('MyGroup');
      expect(result.name).toBe('MyCheck');
      expect(result.items).toEqual([]);
    });

    it('should decode a detail item with state, timestamp, and elapsed', () => {
      // Build the inner message first
      const inner = new BinaryWriter();
      inner.tag(1, 0).int32(1); // Healthy
      inner.tag(2, 0).int64(1700000000); // seconds → will be * 1000
      inner.tag(3, 0).int64(250); // elapsedMilliseconds
      const innerBytes = inner.finish();

      const writer = new BinaryWriter();
      writer.tag(1, 2).string('G');
      writer.tag(2, 2).string('N');
      writer.tag(3, 2).uint32(innerBytes.length);
      writer.raw(innerBytes);
      const buf = writer.finish();

      const result = service.decodePulseDetails(buf.buffer);
      expect(result.group).toBe('G');
      expect(result.name).toBe('N');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].state).toBe(PulseStates.Healthy);
      expect(result.items[0].timestamp).toBe(1700000000000);
      expect(result.items[0].elapsedMilliseconds).toBe(250);
    });

    it('should map state numbers correctly', () => {
      const stateMap: [number, PulseStates][] = [
        [0, PulseStates.Unknown],
        [1, PulseStates.Healthy],
        [2, PulseStates.Degraded],
        [3, PulseStates.Unhealthy],
        [4, PulseStates.TimedOut],
      ];

      for (const [num, expected] of stateMap) {
        const inner = new BinaryWriter();
        inner.tag(1, 0).int32(num);
        inner.tag(2, 0).int64(100);
        const innerBytes = inner.finish();

        const writer = new BinaryWriter();
        writer.tag(3, 2).uint32(innerBytes.length);
        writer.raw(innerBytes);
        const buf = writer.finish();

        const result = service.decodePulseDetails(buf.buffer);
        expect(result.items[0].state).toBe(expected);
      }
    });

    it('should default unknown state numbers to Unknown', () => {
      const inner = new BinaryWriter();
      inner.tag(1, 0).int32(99);
      inner.tag(2, 0).int64(100);
      const innerBytes = inner.finish();

      const writer = new BinaryWriter();
      writer.tag(3, 2).uint32(innerBytes.length);
      writer.raw(innerBytes);
      const buf = writer.finish();

      const result = service.decodePulseDetails(buf.buffer);
      expect(result.items[0].state).toBe(PulseStates.Unknown);
    });
  });

  describe('decodeMetrics', () => {
    it('should decode an empty buffer', () => {
      const result = service.decodeMetrics(new ArrayBuffer(0));
      expect(result.items).toEqual([]);
    });

    it('should decode a metric item with all fields', () => {
      const inner = new BinaryWriter();
      inner.tag(1, 0).int64(1700000000); // timestamp
      inner.tag(2, 1).double(45.5);       // cpu
      inner.tag(3, 1).double(78.2);       // memory
      inner.tag(4, 1).double(12.1);       // io
      const innerBytes = inner.finish();

      const writer = new BinaryWriter();
      writer.tag(1, 2).uint32(innerBytes.length);
      writer.raw(innerBytes);
      const buf = writer.finish();

      const result = service.decodeMetrics(buf.buffer);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].timestamp).toBe(1700000000000);
      expect(result.items[0].cpu).toBeCloseTo(45.5);
      expect(result.items[0].memory).toBeCloseTo(78.2);
      expect(result.items[0].inputOutput).toBeCloseTo(12.1);
    });
  });

  describe('decodeHeatmaps', () => {
    it('should decode an empty buffer', () => {
      const result = service.decodeHeatmaps(new ArrayBuffer(0));
      expect(result.id).toBe('');
      expect(result.items).toEqual([]);
    });

    it('should decode a heatmap with id and items', () => {
      const inner = new BinaryWriter();
      inner.tag(1, 2).string('20240101');
      inner.tag(2, 0).int32(5);   // unknown
      inner.tag(3, 0).int32(80);  // healthy
      inner.tag(4, 0).int32(10);  // degraded
      inner.tag(5, 0).int32(3);   // unhealthy
      inner.tag(6, 0).int32(2);   // timedOut
      const innerBytes = inner.finish();

      const writer = new BinaryWriter();
      writer.tag(1, 2).string('pulse-123');
      writer.tag(2, 2).uint32(innerBytes.length);
      writer.raw(innerBytes);
      const buf = writer.finish();

      const result = service.decodeHeatmaps(buf.buffer);
      expect(result.id).toBe('pulse-123');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        day: '20240101',
        unknown: 5,
        healthy: 80,
        degraded: 10,
        unhealthy: 3,
        timedOut: 2,
      });
    });
  });
});
