import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  let component: ToastContainerComponent;
  let fixture: ComponentFixture<ToastContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // getIcon
  // ---------------------------------------------------------------------------
  describe('getIcon', () => {
    it('should return the check-circle icon for success', () => {
      expect(component.getIcon('success')).toBe('bi-check-circle-fill text-success');
    });

    it('should return the triangle icon for danger', () => {
      expect(component.getIcon('danger')).toBe('bi-exclamation-triangle-fill text-danger');
    });

    it('should return the triangle icon for warning', () => {
      expect(component.getIcon('warning')).toBe('bi-exclamation-triangle-fill text-warning');
    });

    it('should return the info icon for an unrecognised type', () => {
      expect(component.getIcon('info')).toBe('bi-info-circle-fill text-info');
    });

    it('should return the info icon as the default fallback', () => {
      expect(component.getIcon('anything-else')).toBe('bi-info-circle-fill text-info');
    });
  });

  // ---------------------------------------------------------------------------
  // getTitle
  // ---------------------------------------------------------------------------
  describe('getTitle', () => {
    it('should return Success for success type', () => {
      expect(component.getTitle('success')).toBe('Success');
    });

    it('should return Error for danger type', () => {
      expect(component.getTitle('danger')).toBe('Error');
    });

    it('should return Warning for warning type', () => {
      expect(component.getTitle('warning')).toBe('Warning');
    });

    it('should return Info for an unrecognised type', () => {
      expect(component.getTitle('info')).toBe('Info');
    });

    it('should return Info as the default fallback', () => {
      expect(component.getTitle('anything-else')).toBe('Info');
    });
  });
});
