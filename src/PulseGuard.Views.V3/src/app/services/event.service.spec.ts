import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';
import { MAX_EVENT_BUFFER } from '../constants';

describe('EventService', () => {
  let service: EventService;
  let mockEventSource: any;

  beforeEach(() => {
    // Mock EventSource
    mockEventSource = {
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      close: jest.fn(),
    };
    (globalThis as any).EventSource = jest.fn(() => mockEventSource);

    TestBed.configureTestingModule({});
    service = TestBed.inject(EventService);
  });

  afterEach(() => {
    service.disconnect();
    delete (globalThis as any).EventSource;
  });

  it('should start disconnected', () => {
    expect(service.connected()).toBe(false);
    expect(service.events()).toEqual([]);
  });

  it('should set connected on open', () => {
    service.connect('test-url');
    mockEventSource.onopen();
    expect(service.connected()).toBe(true);
  });

  it('should accumulate events on message', () => {
    service.connect('test-url');
    const event = { data: JSON.stringify({ id: '1', group: 'G', name: 'N', state: 'Healthy', creation: '', elapsedMilliseconds: 100 }) };
    mockEventSource.onmessage(event);
    expect(service.events()).toHaveLength(1);
    expect(service.events()[0].id).toBe('1');
  });

  it('should set disconnected on error', () => {
    service.connect('test-url');
    mockEventSource.onopen();
    expect(service.connected()).toBe(true);
    mockEventSource.onerror();
    expect(service.connected()).toBe(false);
  });

  it('should close previous connection on new connect', () => {
    service.connect('url-1');
    const firstSource = mockEventSource;
    service.connect('url-2');
    expect(firstSource.close).toHaveBeenCalled();
  });

  it('should build correct URL for connectAll', () => {
    service.connectAll();
    expect((globalThis as any).EventSource).toHaveBeenCalledWith('api/1.0/pulses/events');
  });

  it('should encode id in connectApplication URL', () => {
    service.connectApplication('my app/test');
    expect((globalThis as any).EventSource).toHaveBeenCalledWith('api/1.0/pulses/events/application/my%20app%2Ftest');
  });

  it('should encode group in connectGroup URL', () => {
    service.connectGroup('my group');
    expect((globalThis as any).EventSource).toHaveBeenCalledWith('api/1.0/pulses/events/group/my%20group');
  });

  it('should cap events buffer at MAX_EVENT_BUFFER', () => {
    service.connect('test-url');
    // Push more than MAX_EVENT_BUFFER events
    for (let i = 0; i < MAX_EVENT_BUFFER + 50; i++) {
      const event = { data: JSON.stringify({ id: String(i), group: 'G', name: 'N', state: 'Healthy', creation: '', elapsedMilliseconds: 0 }) };
      mockEventSource.onmessage(event);
    }
    expect(service.events().length).toBeLessThanOrEqual(MAX_EVENT_BUFFER);
  });

  it('should clean up on disconnect', () => {
    service.connect('test-url');
    service.disconnect();
    expect(mockEventSource.close).toHaveBeenCalled();
    expect(service.connected()).toBe(false);
  });
});
