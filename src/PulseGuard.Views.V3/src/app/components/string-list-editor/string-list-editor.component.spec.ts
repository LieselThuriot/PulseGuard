import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StringListEditorComponent } from './string-list-editor.component';

describe('StringListEditorComponent', () => {
  let component: StringListEditorComponent;
  let fixture: ComponentFixture<StringListEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StringListEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StringListEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty items', () => {
    expect(component.items()).toEqual([]);
  });

  it('should sync items when value input changes', () => {
    fixture.componentRef.setInput('value', ['a', 'b']);
    fixture.detectChanges();
    expect(component.items()).toEqual(['a', 'b']);
  });

  it('should add an empty string on add()', () => {
    component.add();
    expect(component.items()).toEqual(['']);
  });

  it('should remove an item by index', () => {
    fixture.componentRef.setInput('value', ['x', 'y', 'z']);
    fixture.detectChanges();
    component.remove(1);
    expect(component.items()).toEqual(['x', 'z']);
  });

  it('should update an item at an index', () => {
    fixture.componentRef.setInput('value', ['old']);
    fixture.detectChanges();
    component.update(0, 'new');
    expect(component.items()).toEqual(['new']);
  });

  it('should emit valueChange without whitespace-only values on remove', () => {
    fixture.componentRef.setInput('value', ['keep', '  ', 'also']);
    fixture.detectChanges();

    const spy = jest.fn();
    component.valueChange.subscribe(spy);

    component.remove(1); // remove the whitespace one
    expect(spy).toHaveBeenCalledWith(['keep', 'also']);
  });

  it('should emit valueChange on update', () => {
    fixture.componentRef.setInput('value', ['a']);
    fixture.detectChanges();

    const spy = jest.fn();
    component.valueChange.subscribe(spy);

    component.update(0, 'b');
    expect(spy).toHaveBeenCalledWith(['b']);
  });

  it('should use custom placeholder and addLabel', () => {
    fixture.componentRef.setInput('placeholder', 'URL');
    fixture.componentRef.setInput('addLabel', 'Add URL');
    fixture.detectChanges();

    expect(component.placeholder()).toBe('URL');
    expect(component.addLabel()).toBe('Add URL');
  });
});
