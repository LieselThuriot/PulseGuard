import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockModal: { close: jest.Mock; dismiss: jest.Mock };

  beforeEach(async () => {
    mockModal = { close: jest.fn(), dismiss: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [{ provide: NgbActiveModal, useValue: mockModal }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default values', () => {
    it('should use "Confirm Delete" as the default title', () => {
      expect(component.title()).toBe('Confirm Delete');
    });

    it('should have a non-empty default message', () => {
      expect(component.message()).toBeTruthy();
    });

    it('should mention deletion in the default message', () => {
      expect(component.message().toLowerCase()).toContain('delete');
    });
  });

  describe('custom inputs', () => {
    it('should display a custom title when provided', () => {
      fixture.componentRef.setInput('title', 'Remove User?');
      fixture.detectChanges();
      expect(component.title()).toBe('Remove User?');
    });

    it('should display a custom message when provided', () => {
      fixture.componentRef.setInput('message', 'This action is permanent and cannot be undone.');
      fixture.detectChanges();
      expect(component.message()).toBe('This action is permanent and cannot be undone.');
    });
  });

  describe('modal integration', () => {
    it('should expose NgbActiveModal as modal', () => {
      expect(component.modal).toBe(mockModal);
    });

    it('modal.close should be callable (confirm action)', () => {
      component.modal.close('confirmed');
      expect(mockModal.close).toHaveBeenCalledWith('confirmed');
    });

    it('modal.dismiss should be callable (cancel action)', () => {
      component.modal.dismiss();
      expect(mockModal.dismiss).toHaveBeenCalled();
    });
  });
});
