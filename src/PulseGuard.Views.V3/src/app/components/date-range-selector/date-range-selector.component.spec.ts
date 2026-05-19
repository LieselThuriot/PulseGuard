import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { DateRangeSelectorComponent, DateRange } from './date-range-selector.component';

describe('DateRangeSelectorComponent', () => {
  let component: DateRangeSelectorComponent;
  let fixture: ComponentFixture<DateRangeSelectorComponent>;
  let mockRouter: { url: string; parseUrl: jest.Mock; navigateByUrl: jest.Mock };
  let mockQueryParamMap: { get: jest.Mock };

  function buildProviders() {
    return [
      { provide: Router, useValue: mockRouter },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: mockQueryParamMap } },
      },
    ];
  }

  beforeEach(() => {
    mockRouter = {
      url: '/',
      parseUrl: jest.fn(() => ({ queryParams: {} as Record<string, string> })),
      navigateByUrl: jest.fn(),
    };
    mockQueryParamMap = { get: jest.fn().mockReturnValue(null) };
  });

  // Helper: create component WITHOUT calling detectChanges (so ngOnInit hasn't run yet).
  async function createComponent(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [DateRangeSelectorComponent],
      providers: buildProviders(),
    }).compileComponents();

    fixture = TestBed.createComponent(DateRangeSelectorComponent);
    component = fixture.componentInstance;
  }

  // ---------------------------------------------------------------------------
  // ngOnInit — no query params
  // ---------------------------------------------------------------------------
  describe('ngOnInit with no query params', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges(); // triggers ngOnInit
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should default activeLabel to "today"', () => {
      expect(component.activeLabel()).toBe('today');
    });

    it('should populate fromValue and toValue', () => {
      expect(component.fromValue()).not.toBe('');
      expect(component.toValue()).not.toBe('');
    });

    it('should call navigateByUrl to clean up any stale query params', () => {
      expect(mockRouter.navigateByUrl).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // ngOnInit — valid query params
  // ---------------------------------------------------------------------------
  describe('ngOnInit with valid from/to query params', () => {
    const fromDate = new Date('2025-01-01T10:00:00.000Z');
    const toDate = new Date('2025-01-07T18:00:00.000Z');

    beforeEach(async () => {
      mockQueryParamMap.get.mockImplementation((key: string) => {
        if (key === 'from') return fromDate.toISOString();
        if (key === 'to') return toDate.toISOString();
        return null;
      });
      await createComponent();
    });

    it('should set activeLabel to "custom"', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      fixture.detectChanges();
      expect(component.activeLabel()).toBe('custom');
    });

    it('should emit rangeChange with the parsed dates', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      fixture.detectChanges();
      expect(spy).toHaveBeenCalledTimes(1);
      const emitted: DateRange = spy.mock.calls[0][0];
      expect(emitted.from.toISOString()).toBe(fromDate.toISOString());
      expect(emitted.to.toISOString()).toBe(toDate.toISOString());
    });
  });

  // ---------------------------------------------------------------------------
  // ngOnInit — invalid query params
  // ---------------------------------------------------------------------------
  describe('ngOnInit with invalid date query params', () => {
    beforeEach(async () => {
      mockQueryParamMap.get.mockImplementation((key: string) => {
        if (key === 'from') return 'not-a-date';
        if (key === 'to') return 'also-not-a-date';
        return null;
      });
      await createComponent();
      fixture.detectChanges();
    });

    it('should fall back to "today" when dates are invalid', () => {
      expect(component.activeLabel()).toBe('today');
    });
  });

  // ---------------------------------------------------------------------------
  // selectToday
  // ---------------------------------------------------------------------------
  describe('selectToday', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges();
    });

    it('should set activeLabel to "today"', () => {
      component.selectAll(); // change away first
      component.selectToday();
      expect(component.activeLabel()).toBe('today');
    });

    it('should emit rangeChange', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.selectToday();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit a range where from is at UTC midnight', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.selectToday();
      const range: DateRange = spy.mock.calls[0][0];
      expect(range.from.getUTCHours()).toBe(0);
      expect(range.from.getUTCMinutes()).toBe(0);
      expect(range.from.getUTCSeconds()).toBe(0);
    });

    it('should emit a range where to is at 23:59 of the same day', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.selectToday();
      const range: DateRange = spy.mock.calls[0][0];
      expect(range.to.getHours()).toBe(23);
      expect(range.to.getMinutes()).toBe(59);
    });

    it('should remove from/to query params for today (URL cleanup)', () => {
      const urlTree = { queryParams: { from: '2025-01-01', to: '2025-01-02' } };
      mockRouter.parseUrl.mockReturnValue(urlTree);
      component.selectToday();
      expect(urlTree.queryParams['from']).toBeUndefined();
      expect(urlTree.queryParams['to']).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // selectAll
  // ---------------------------------------------------------------------------
  describe('selectAll', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges();
    });

    it('should set activeLabel to "All"', () => {
      component.selectAll();
      expect(component.activeLabel()).toBe('All');
    });

    it('should emit rangeChange', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.selectAll();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit a range where from is the epoch (1 Jan 1970 UTC)', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.selectAll();
      const range: DateRange = spy.mock.calls[0][0];
      expect(range.from.getTime()).toBe(0);
    });

    it('should set ISO query params in the URL (not "today")', () => {
      const urlTree = { queryParams: {} as Record<string, string> };
      mockRouter.parseUrl.mockReturnValue(urlTree);
      component.selectAll();
      expect(urlTree.queryParams['from']).toBeDefined();
      expect(urlTree.queryParams['to']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // selectPreset
  // ---------------------------------------------------------------------------
  describe('selectPreset', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges();
    });

    it('should set activeLabel to the preset label', () => {
      const preset = component.presets.find((p) => p.label === '24h')!;
      component.selectPreset(preset);
      expect(component.activeLabel()).toBe('24h');
    });

    it('should emit rangeChange with the correct time range', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);

      const before = Date.now();
      const preset = component.presets.find((p) => p.label === '24h')!;
      component.selectPreset(preset);
      const after = Date.now();

      const range: DateRange = spy.mock.calls[0][0];
      const expectedFrom = before - 24 * 60 * 60 * 1000;
      const expectedTo = after;

      expect(range.from.getTime()).toBeGreaterThanOrEqual(expectedFrom);
      expect(range.from.getTime()).toBeLessThanOrEqual(expectedTo);
      expect(range.to.getTime()).toBeGreaterThanOrEqual(range.from.getTime());
    });

    it('should set ISO query params in the URL', () => {
      const urlTree = { queryParams: {} as Record<string, string> };
      mockRouter.parseUrl.mockReturnValue(urlTree);
      component.selectPreset(component.presets[0]);
      expect(urlTree.queryParams['from']).toBeDefined();
      expect(urlTree.queryParams['to']).toBeDefined();
    });

    it('should expose all 7 presets', () => {
      expect(component.presets).toHaveLength(7);
    });
  });

  // ---------------------------------------------------------------------------
  // onFromChange
  // ---------------------------------------------------------------------------
  describe('onFromChange', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges();
      // Set a valid toValue so the range is complete
      component.toValue.set('2025-06-10T23:59');
    });

    it('should update the fromValue signal immediately', () => {
      component.onFromChange('2025-06-01T10:00');
      expect(component.fromValue()).toBe('2025-06-01T10:00');
    });

    it('should set activeLabel to "custom"', () => {
      component.onFromChange('2025-06-01T10:00');
      expect(component.activeLabel()).toBe('custom');
    });

    it('should emit rangeChange when both from and to are valid dates', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.onFromChange('2025-06-01T10:00');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should NOT emit rangeChange when the from value is not a valid date', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.onFromChange('not-a-date');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onToChange
  // ---------------------------------------------------------------------------
  describe('onToChange', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges();
      // Set a valid fromValue
      component.fromValue.set('2025-06-01T10:00');
    });

    it('should update the toValue signal immediately', () => {
      component.onToChange('2025-06-10T23:59');
      expect(component.toValue()).toBe('2025-06-10T23:59');
    });

    it('should set activeLabel to "custom"', () => {
      component.onToChange('2025-06-10T23:59');
      expect(component.activeLabel()).toBe('custom');
    });

    it('should emit rangeChange when both from and to are valid dates', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.onToChange('2025-06-10T23:59');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should NOT emit rangeChange when the to value is not a valid date', () => {
      const spy = jest.fn();
      component.rangeChange.subscribe(spy);
      component.onToChange('bad-date');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // setRange input effect
  // ---------------------------------------------------------------------------
  describe('setRange input effect', () => {
    beforeEach(async () => {
      await createComponent();
      fixture.detectChanges();
    });

    it('should update fromValue and toValue when setRange input is set', () => {
      const range: DateRange = {
        from: new Date('2025-03-01T08:00:00.000Z'),
        to: new Date('2025-03-07T20:00:00.000Z'),
      };
      fixture.componentRef.setInput('setRange', range);
      TestBed.flushEffects();
      expect(component.fromValue()).not.toBe('');
      expect(component.toValue()).not.toBe('');
    });

    it('should set activeLabel to "custom" when setRange is provided', () => {
      const range: DateRange = {
        from: new Date('2025-03-01T08:00:00.000Z'),
        to: new Date('2025-03-07T20:00:00.000Z'),
      };
      fixture.componentRef.setInput('setRange', range);
      TestBed.flushEffects();
      expect(component.activeLabel()).toBe('custom');
    });

    it('should not change signals when setRange is null', () => {
      const initialFrom = component.fromValue();
      fixture.componentRef.setInput('setRange', null);
      TestBed.flushEffects();
      expect(component.fromValue()).toBe(initialFrom);
    });
  });
});
