import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UptimeBadgeComponent } from './uptime-badge.component';

describe('UptimeBadgeComponent', () => {
  let component: UptimeBadgeComponent;
  let fixture: ComponentFixture<UptimeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UptimeBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UptimeBadgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('percentage', 100);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // cssClass
  // ---------------------------------------------------------------------------
  describe('cssClass', () => {
    it.each([
      [100, 'text-bg-success'],
      [99, 'text-bg-success'],
      [95, 'text-bg-success'],
      [94, 'text-bg-warning'],
      [87, 'text-bg-warning'],
      [80, 'text-bg-warning'],
      [79, 'text-bg-danger'],
      [50, 'text-bg-danger'],
      [1, 'text-bg-danger'],
      [0, 'text-bg-danger'],
    ])('should return %s for %d%%', (pct, expected) => {
      fixture.componentRef.setInput('percentage', pct);
      fixture.detectChanges();
      expect(component.cssClass()).toBe(expected);
    });
  });

  // ---------------------------------------------------------------------------
  // opacity
  // ---------------------------------------------------------------------------
  describe('opacity', () => {
    it('should return 1.0 for 100% (top of success tier)', () => {
      fixture.componentRef.setInput('percentage', 100);
      fixture.detectChanges();
      // 0.7 + (100 - 95) * 0.06 = 0.7 + 0.30 = 1.0
      expect(component.opacity()).toBeCloseTo(1.0, 5);
    });

    it('should return 0.7 for 95% (bottom of success tier)', () => {
      fixture.componentRef.setInput('percentage', 95);
      fixture.detectChanges();
      // 0.7 + (95 - 95) * 0.06 = 0.7
      expect(component.opacity()).toBeCloseTo(0.7, 5);
    });

    it('should return 1.0 for 80% (bottom of warning tier)', () => {
      fixture.componentRef.setInput('percentage', 80);
      fixture.detectChanges();
      // 1 - ((80 - 80) / 15) * 0.3 = 1.0
      expect(component.opacity()).toBeCloseTo(1.0, 5);
    });

    it('should return reduced opacity for 94% (top of warning tier)', () => {
      fixture.componentRef.setInput('percentage', 94);
      fixture.detectChanges();
      // 1 - ((94 - 80) / 15) * 0.3
      expect(component.opacity()).toBeCloseTo(1 - (14 / 15) * 0.3, 5);
    });

    it('should return 1.0 for 0% (bottom of danger tier)', () => {
      fixture.componentRef.setInput('percentage', 0);
      fixture.detectChanges();
      // 1 - (0 / 79) * 0.3 = 1.0
      expect(component.opacity()).toBeCloseTo(1.0, 5);
    });

    it('should return a value between 0 and 1 for any valid percentage', () => {
      for (const pct of [0, 10, 50, 79, 80, 90, 95, 100]) {
        fixture.componentRef.setInput('percentage', pct);
        fixture.detectChanges();
        expect(component.opacity()).toBeGreaterThanOrEqual(0);
        expect(component.opacity()).toBeLessThanOrEqual(1);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // tooltip
  // ---------------------------------------------------------------------------
  describe('tooltip', () => {
    it('should contain the percentage value', () => {
      fixture.componentRef.setInput('percentage', 87.5);
      fixture.detectChanges();
      expect(component.tooltip()).toContain('87.5');
    });

    it('should mention uptime and the 12-hour window', () => {
      fixture.componentRef.setInput('percentage', 99);
      fixture.detectChanges();
      expect(component.tooltip()).toContain('uptime');
      expect(component.tooltip()).toContain('12 hours');
    });

    it('should update the tooltip when the percentage input changes', () => {
      fixture.componentRef.setInput('percentage', 50);
      fixture.detectChanges();
      expect(component.tooltip()).toContain('50');

      fixture.componentRef.setInput('percentage', 100);
      fixture.detectChanges();
      expect(component.tooltip()).toContain('100');
    });
  });
});
