import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PulseDetailService } from './pulse-detail.service';
import { ProtobufService } from './protobuf.service';
import { SUPPRESS_NOT_FOUND } from '../interceptors/error.interceptor';

describe('PulseDetailService', () => {
  let service: PulseDetailService;
  let httpTesting: HttpTestingController;
  let mockProto: jest.Mocked<Pick<ProtobufService, 'decodePulseDetails' | 'decodeMetrics' | 'decodeHeatmaps'>>;

  beforeEach(() => {
    mockProto = {
      decodePulseDetails: jest.fn().mockReturnValue({ group: 'g', name: 'n', items: [] }),
      decodeMetrics: jest.fn().mockReturnValue({ items: [] }),
      decodeHeatmaps: jest.fn().mockReturnValue({ id: 'x', items: [] }),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ProtobufService, useValue: mockProto },
      ],
    });

    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PulseDetailService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('getDetails', () => {
    it('should GET the correct URL with the encoded ID', () => {
      service.getDetails('simple-id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/simple-id');
      expect(req.request.method).toBe('GET');
      req.flush(new ArrayBuffer(0));
    });

    it('should encode spaces and slashes in the ID', () => {
      service.getDetails('my app/test').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/my%20app%2Ftest');
      expect(req.request.method).toBe('GET');
      req.flush(new ArrayBuffer(0));
    });

    it('should use arraybuffer responseType', () => {
      service.getDetails('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/id');
      expect(req.request.responseType).toBe('arraybuffer');
      req.flush(new ArrayBuffer(0));
    });

    it('should delegate to proto.decodePulseDetails with the response buffer', () => {
      service.getDetails('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/id');
      req.flush(new ArrayBuffer(8));
      expect(mockProto.decodePulseDetails).toHaveBeenCalled();
    });

    it('should NOT set SUPPRESS_NOT_FOUND context', () => {
      service.getDetails('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/id');
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(false);
      req.flush(new ArrayBuffer(0));
    });
  });

  describe('getArchivedDetails', () => {
    it('should append /archived to the details URL', () => {
      service.getArchivedDetails('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/id/archived');
      expect(req.request.method).toBe('GET');
      req.flush(new ArrayBuffer(0));
    });

    it('should set SUPPRESS_NOT_FOUND context', () => {
      service.getArchivedDetails('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/id/archived');
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(true);
      req.flush(new ArrayBuffer(0));
    });

    it('should encode the ID', () => {
      service.getArchivedDetails('my/id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/details/my%2Fid/archived');
      req.flush(new ArrayBuffer(0));
    });
  });

  describe('getMetrics', () => {
    it('should GET the metrics URL with the encoded ID', () => {
      service.getMetrics('my app').subscribe();
      const req = httpTesting.expectOne('api/1.0/metrics/my%20app');
      expect(req.request.method).toBe('GET');
      req.flush(new ArrayBuffer(0));
    });

    it('should set SUPPRESS_NOT_FOUND context', () => {
      service.getMetrics('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/metrics/id');
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(true);
      req.flush(new ArrayBuffer(0));
    });

    it('should delegate to proto.decodeMetrics with the buffer', () => {
      service.getMetrics('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/metrics/id');
      req.flush(new ArrayBuffer(0));
      expect(mockProto.decodeMetrics).toHaveBeenCalled();
    });
  });

  describe('getArchivedMetrics', () => {
    it('should append /archived to the metrics URL', () => {
      service.getArchivedMetrics('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/metrics/id/archived');
      expect(req.request.method).toBe('GET');
      req.flush(new ArrayBuffer(0));
    });

    it('should set SUPPRESS_NOT_FOUND context', () => {
      service.getArchivedMetrics('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/metrics/id/archived');
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(true);
      req.flush(new ArrayBuffer(0));
    });
  });

  describe('getHeatmap', () => {
    it('should GET the heatmap URL with the encoded ID', () => {
      service.getHeatmap('my/id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/heatmap/my%2Fid');
      expect(req.request.method).toBe('GET');
      req.flush(new ArrayBuffer(0));
    });

    it('should set SUPPRESS_NOT_FOUND context', () => {
      service.getHeatmap('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/heatmap/id');
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(true);
      req.flush(new ArrayBuffer(0));
    });

    it('should delegate to proto.decodeHeatmaps with the buffer', () => {
      service.getHeatmap('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/heatmap/id');
      req.flush(new ArrayBuffer(0));
      expect(mockProto.decodeHeatmaps).toHaveBeenCalled();
    });
  });

  describe('getDeployments', () => {
    it('should GET deployments as JSON (no arraybuffer)', () => {
      service.getDeployments('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/application/id/deployments');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('json');
      req.flush({ id: 'id', items: [] });
    });

    it('should set SUPPRESS_NOT_FOUND context', () => {
      service.getDeployments('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/application/id/deployments');
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(true);
      req.flush({ id: 'id', items: [] });
    });

    it('should encode the ID', () => {
      service.getDeployments('my app').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/application/my%20app/deployments');
      req.flush({ id: 'my app', items: [] });
    });
  });

  describe('getLogs', () => {
    it('should include the default pageSize of 50', () => {
      service.getLogs('id').subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/application/id?pageSize=50');
      expect(req.request.method).toBe('GET');
      req.flush({ id: 'id', name: 'n', items: [] });
    });

    it('should use a custom pageSize when provided', () => {
      service.getLogs('id', undefined, 25).subscribe();
      const req = httpTesting.expectOne('api/1.0/pulses/application/id?pageSize=25');
      req.flush({ id: 'id', name: 'n', items: [] });
    });

    it('should append the encoded continuationToken when provided', () => {
      service.getLogs('id', 'tok en/1').subscribe();
      const req = httpTesting.expectOne(
        'api/1.0/pulses/application/id?pageSize=50&continuationToken=tok%20en%2F1',
      );
      req.flush({ id: 'id', name: 'n', items: [] });
    });

    it('should omit the continuationToken when not provided', () => {
      service.getLogs('id').subscribe();
      const req = httpTesting.expectOne((r) => r.url.includes('pulses/application/id'));
      expect(req.request.url).not.toContain('continuationToken');
      req.flush({ id: 'id', name: 'n', items: [] });
    });

    it('should set SUPPRESS_NOT_FOUND context', () => {
      service.getLogs('id').subscribe();
      const req = httpTesting.expectOne((r) => r.url.includes('pulses/application/id'));
      expect(req.request.context.get(SUPPRESS_NOT_FOUND)).toBe(true);
      req.flush({ id: 'id', name: 'n', items: [] });
    });

    it('should encode the ID', () => {
      service.getLogs('my app/test').subscribe();
      const req = httpTesting.expectOne((r) => r.url.includes('my%20app%2Ftest'));
      req.flush({ id: 'id', name: 'n', items: [] });
    });
  });
});
