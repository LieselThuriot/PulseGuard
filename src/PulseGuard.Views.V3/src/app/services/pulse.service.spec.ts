import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PulseService } from './pulse.service';
import { PulseOverviewGroup } from '../models/pulse-overview.model';

describe('PulseService', () => {
  let service: PulseService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpTesting = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PulseService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('initial state', () => {
    it('should start with empty overview, loading false, no selection, and filter off', () => {
      expect(service.overview()).toEqual([]);
      expect(service.loading()).toBe(false);
      expect(service.selectedPulseId()).toBeNull();
      expect(service.filterUnhealthy()).toBe(false);
    });
  });

  describe('loadOverview', () => {
    it('should set loading to true when the request starts', () => {
      service.loadOverview();
      expect(service.loading()).toBe(true);
      httpTesting.expectOne('api/1.0/pulses').flush([]);
    });

    it('should set loading to false on success', () => {
      service.loadOverview();
      httpTesting.expectOne('api/1.0/pulses').flush([]);
      expect(service.loading()).toBe(false);
    });

    it('should set loading to false after error and retry exhausted', () => {
      jest.useFakeTimers();

      service.loadOverview();
      expect(service.loading()).toBe(true);

      httpTesting.expectOne('api/1.0/pulses').error(new ProgressEvent('error'));
      jest.advanceTimersByTime(1000);
      httpTesting.expectOne('api/1.0/pulses').error(new ProgressEvent('error'));

      expect(service.loading()).toBe(false);
      jest.useRealTimers();
    });

    it('should sort groups alphabetically with the empty-name group last', () => {
      service.loadOverview();
      const data: PulseOverviewGroup[] = [
        { group: 'Beta', items: [] },
        { group: '', items: [] },
        { group: 'Alpha', items: [] },
      ];
      httpTesting.expectOne('api/1.0/pulses').flush(data);

      const groups = service.overview().map((g) => g.group);
      expect(groups).toEqual(['Alpha', 'Beta', '']);
    });

    it('should sort items within each group alphabetically by name', () => {
      service.loadOverview();
      const data: PulseOverviewGroup[] = [
        {
          group: 'G',
          items: [
            { id: '3', name: 'Zebra', items: [] },
            { id: '1', name: 'Alpha', items: [] },
            { id: '2', name: 'Mango', items: [] },
          ],
        },
      ];
      httpTesting.expectOne('api/1.0/pulses').flush(data);

      const names = service.overview()[0].items.map((i) => i.name);
      expect(names).toEqual(['Alpha', 'Mango', 'Zebra']);
    });

    it('should handle multiple groups with the empty group last and each group sorted', () => {
      service.loadOverview();
      const data: PulseOverviewGroup[] = [
        { group: '', items: [{ id: '2', name: 'B', items: [] }, { id: '1', name: 'A', items: [] }] },
        { group: 'Z', items: [] },
        { group: 'A', items: [] },
      ];
      httpTesting.expectOne('api/1.0/pulses').flush(data);

      const groups = service.overview().map((g) => g.group);
      expect(groups).toEqual(['A', 'Z', '']);
      expect(service.overview()[2].items.map((i) => i.name)).toEqual(['A', 'B']);
    });

    it('should store the sorted result in the overview signal', () => {
      service.loadOverview();
      const data: PulseOverviewGroup[] = [
        { group: 'Production', items: [{ id: 'p1', name: 'API', items: [] }] },
      ];
      httpTesting.expectOne('api/1.0/pulses').flush(data);

      expect(service.overview()).toHaveLength(1);
      expect(service.overview()[0].group).toBe('Production');
      expect(service.overview()[0].items[0].name).toBe('API');
    });

    it('should send a GET request to api/1.0/pulses', () => {
      service.loadOverview();
      const req = httpTesting.expectOne('api/1.0/pulses');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('selectPulse / deselectPulse', () => {
    it('should set selectedPulseId to the given id', () => {
      service.selectPulse('my-pulse-id');
      expect(service.selectedPulseId()).toBe('my-pulse-id');
    });

    it('should overwrite a previous selection', () => {
      service.selectPulse('first');
      service.selectPulse('second');
      expect(service.selectedPulseId()).toBe('second');
    });

    it('should clear selectedPulseId to null on deselectPulse', () => {
      service.selectPulse('some-id');
      service.deselectPulse();
      expect(service.selectedPulseId()).toBeNull();
    });
  });

  describe('toggleFilter', () => {
    it('should flip filterUnhealthy from false to true', () => {
      expect(service.filterUnhealthy()).toBe(false);
      service.toggleFilter();
      expect(service.filterUnhealthy()).toBe(true);
    });

    it('should flip filterUnhealthy back to false on a second call', () => {
      service.toggleFilter();
      service.toggleFilter();
      expect(service.filterUnhealthy()).toBe(false);
    });
  });
});
