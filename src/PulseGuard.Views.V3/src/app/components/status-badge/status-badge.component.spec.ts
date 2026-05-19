import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';
import { PulseStates, STATE_CSS_CLASSES } from '../../models/pulse-states.enum';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('state', PulseStates.Healthy);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each(Object.values(PulseStates))(
    'should map PulseStates.%s to the correct CSS class',
    (state) => {
      fixture.componentRef.setInput('state', state);
      fixture.detectChanges();
      expect(component.cssClass()).toBe(STATE_CSS_CLASSES[state]);
    },
  );

  it('should map Healthy to text-bg-success', () => {
    fixture.componentRef.setInput('state', PulseStates.Healthy);
    fixture.detectChanges();
    expect(component.cssClass()).toBe('text-bg-success');
  });

  it('should map Degraded to text-bg-warning', () => {
    fixture.componentRef.setInput('state', PulseStates.Degraded);
    fixture.detectChanges();
    expect(component.cssClass()).toBe('text-bg-warning');
  });

  it('should map Unhealthy to text-bg-danger', () => {
    fixture.componentRef.setInput('state', PulseStates.Unhealthy);
    fixture.detectChanges();
    expect(component.cssClass()).toBe('text-bg-danger');
  });

  it('should map TimedOut to text-bg-pink', () => {
    fixture.componentRef.setInput('state', PulseStates.TimedOut);
    fixture.detectChanges();
    expect(component.cssClass()).toBe('text-bg-pink');
  });

  it('should map Unknown to text-bg-secondary', () => {
    fixture.componentRef.setInput('state', PulseStates.Unknown);
    fixture.detectChanges();
    expect(component.cssClass()).toBe('text-bg-secondary');
  });
});
