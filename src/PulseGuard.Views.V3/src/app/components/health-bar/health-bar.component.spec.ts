import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HealthBarComponent } from './health-bar.component';
import { PulseStates } from '../../models/pulse-states.enum';
import { PulseCheckResultDetail } from '../../models/pulse-detail.model';
import { HEALTH_BAR_OVERVIEW_BUCKETS, HEALTH_BAR_DETAIL_BUCKETS } from '../../constants';

describe('HealthBarComponent', () => {
  let component: HealthBarComponent;
  let fixture: ComponentFixture<HealthBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthBarComponent);
    component = fixture.componentInstance;
  });

  describe('overview buckets (default mode)', () => {
    it('should create the correct number of overview buckets', () => {
      fixture.detectChanges();
      const buckets = component.buckets();
      expect(buckets.length).toBe(HEALTH_BAR_OVERVIEW_BUCKETS);
    });

    it('should default to Unknown state when no items match', () => {
      fixture.detectChanges();
      const buckets = component.buckets();
      buckets.forEach(b => expect(b.state).toBe(PulseStates.Unknown));
    });
  });

  describe('detail buckets', () => {
    it('should create detail buckets when detailItems is provided', () => {
      const now = Date.now();
      const items: PulseCheckResultDetail[] = [
        { state: PulseStates.Healthy, timestamp: now - 3600_000 },
        { state: PulseStates.Healthy, timestamp: now },
      ];

      fixture.componentRef.setInput('detailItems', items);
      fixture.detectChanges();

      const buckets = component.buckets();
      expect(buckets.length).toBe(HEALTH_BAR_DETAIL_BUCKETS);
    });

    it('should pick the worst state in a bucket', () => {
      const base = 1700000000000;
      // Put healthy and unhealthy in the same time range
      const items: PulseCheckResultDetail[] = [
        { state: PulseStates.Healthy, timestamp: base },
        { state: PulseStates.Unhealthy, timestamp: base + 1000 },
        { state: PulseStates.Healthy, timestamp: base + 3600_000 },
      ];

      fixture.componentRef.setInput('detailItems', items);
      fixture.detectChanges();

      const buckets = component.buckets();
      // The first bucket should contain both items and pick the worst state
      const firstBucketWithData = buckets.find(b => b.state !== PulseStates.Unknown);
      expect(firstBucketWithData).toBeDefined();
      // The worst of Healthy and Unhealthy should be Unhealthy
      expect(firstBucketWithData!.state).toBe(PulseStates.Unhealthy);
    });

    it('should handle single-item arrays', () => {
      const items: PulseCheckResultDetail[] = [
        { state: PulseStates.Degraded, timestamp: 1700000000000 },
      ];

      fixture.componentRef.setInput('detailItems', items);
      fixture.detectChanges();

      const buckets = component.buckets();
      expect(buckets.length).toBe(HEALTH_BAR_DETAIL_BUCKETS);
    });

    it('should handle empty array', () => {
      fixture.componentRef.setInput('detailItems', []);
      fixture.detectChanges();

      const buckets = component.buckets();
      expect(buckets).toEqual([]);
    });

    it('should generate tooltip strings', () => {
      const now = Date.now();
      const items: PulseCheckResultDetail[] = [
        { state: PulseStates.Healthy, timestamp: now - 3600_000 },
        { state: PulseStates.Healthy, timestamp: now },
      ];

      fixture.componentRef.setInput('detailItems', items);
      fixture.detectChanges();

      const buckets = component.buckets();
      buckets.forEach(b => expect(b.tooltip).toBeTruthy());
    });
  });

  describe('state CSS classes', () => {
    it('should map states to correct CSS classes', () => {
      const now = Date.now();
      const items: PulseCheckResultDetail[] = [
        { state: PulseStates.Healthy, timestamp: now },
      ];

      fixture.componentRef.setInput('detailItems', items);
      fixture.detectChanges();

      const buckets = component.buckets();
      const healthyBucket = buckets.find(b => b.state === PulseStates.Healthy);
      if (healthyBucket) {
        expect(healthyBucket.cssClass).toBe('text-bg-success');
      }
    });
  });
});
