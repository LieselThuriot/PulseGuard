import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RenameDialogComponent } from './rename-dialog.component';

describe('RenameDialogComponent', () => {
  let component: RenameDialogComponent;
  let fixture: ComponentFixture<RenameDialogComponent>;
  let mockModal: { close: jest.Mock; dismiss: jest.Mock };

  beforeEach(async () => {
    mockModal = { close: jest.fn(), dismiss: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [RenameDialogComponent],
      providers: [{ provide: NgbActiveModal, useValue: mockModal }],
    }).compileComponents();

    fixture = TestBed.createComponent(RenameDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('default properties', () => {
    it('should default isConfig to true', () => {
      expect(component.isConfig).toBe(true);
    });

    it('should default label to "Configuration"', () => {
      expect(component.label).toBe('Configuration');
    });

    it('should start with empty name and group signals', () => {
      expect(component.name()).toBe('');
      expect(component.group()).toBe('');
    });
  });

  describe('save() guard clause', () => {
    it('should not call modal.close when name is empty', () => {
      component.name.set('');
      component.save();
      expect(mockModal.close).not.toHaveBeenCalled();
    });

    it('should not call modal.close when name is whitespace only', () => {
      component.name.set('   ');
      component.save();
      expect(mockModal.close).not.toHaveBeenCalled();
    });

    it('should not call modal.close when name contains only tabs and spaces', () => {
      component.name.set('\t  \t');
      component.save();
      expect(mockModal.close).not.toHaveBeenCalled();
    });
  });

  describe('save() result shape', () => {
    it('should call modal.close with the trimmed name', () => {
      component.name.set('  My Config  ');
      component.save();
      expect(mockModal.close).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My Config' }),
      );
    });

    it('should include trimmed group in the result when isConfig is true', () => {
      component.isConfig = true;
      component.name.set('My Config');
      component.group.set('  Production  ');
      component.save();
      expect(mockModal.close).toHaveBeenCalledWith({ name: 'My Config', group: 'Production' });
    });

    it('should exclude group from the result when isConfig is false', () => {
      component.isConfig = false;
      component.name.set('John');
      component.group.set('SomeGroup');
      component.save();
      const result = mockModal.close.mock.calls[0][0];
      expect(result).toEqual({ name: 'John' });
      expect(result).not.toHaveProperty('group');
    });

    it('should trim both name and group', () => {
      component.isConfig = true;
      component.name.set('  Trimmed Name  ');
      component.group.set('  Trimmed Group  ');
      component.save();
      expect(mockModal.close).toHaveBeenCalledWith({
        name: 'Trimmed Name',
        group: 'Trimmed Group',
      });
    });

    it('should include an empty string for group when isConfig is true and group is empty', () => {
      component.isConfig = true;
      component.name.set('Config');
      component.group.set('');
      component.save();
      expect(mockModal.close).toHaveBeenCalledWith({ name: 'Config', group: '' });
    });
  });
});
