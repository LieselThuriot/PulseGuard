import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeaderEditorComponent } from './header-editor.component';

describe('HeaderEditorComponent', () => {
  let component: HeaderEditorComponent;
  let fixture: ComponentFixture<HeaderEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty rows', () => {
    expect(component.rows()).toEqual([]);
  });

  it('should sync rows when value input is set', () => {
    fixture.componentRef.setInput('value', { 'Content-Type': 'application/json', Authorization: 'Bearer token' });
    fixture.detectChanges();
    expect(component.rows()).toEqual([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer token' },
    ]);
  });

  it('should add an empty row', () => {
    component.add();
    expect(component.rows()).toEqual([{ key: '', value: '' }]);
  });

  it('should remove a row by index', () => {
    fixture.componentRef.setInput('value', { A: '1', B: '2', C: '3' });
    fixture.detectChanges();
    component.remove(1);
    expect(component.rows().map(r => r.key)).toEqual(['A', 'C']);
  });

  it('should update a key', () => {
    fixture.componentRef.setInput('value', { Old: 'val' });
    fixture.detectChanges();
    component.updateKey(0, 'New');
    expect(component.rows()[0].key).toBe('New');
  });

  it('should update a value', () => {
    fixture.componentRef.setInput('value', { Key: 'old' });
    fixture.detectChanges();
    component.updateValue(0, 'new');
    expect(component.rows()[0].value).toBe('new');
  });

  it('should emit record on updateKey', () => {
    fixture.componentRef.setInput('value', { A: '1' });
    fixture.detectChanges();

    const spy = jest.fn();
    component.valueChange.subscribe(spy);

    component.updateKey(0, 'B');
    expect(spy).toHaveBeenCalledWith({ B: '1' });
  });

  it('should emit undefined when all keys are blank', () => {
    fixture.componentRef.setInput('value', { A: '1' });
    fixture.detectChanges();

    const spy = jest.fn();
    component.valueChange.subscribe(spy);

    component.updateKey(0, '  ');
    expect(spy).toHaveBeenCalledWith(undefined);
  });

  it('should handle undefined input', () => {
    fixture.componentRef.setInput('value', undefined);
    fixture.detectChanges();
    expect(component.rows()).toEqual([]);
  });
});
