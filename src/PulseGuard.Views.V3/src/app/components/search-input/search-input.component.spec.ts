import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchInputComponent } from './search-input.component';
import { vi } from 'vitest';

describe('SearchInputComponent', () => {
  let component: SearchInputComponent;
  let fixture: ComponentFixture<SearchInputComponent>;

  beforeEach(async () => {
    vi.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [SearchInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with an empty query signal', () => {
    expect(component.query()).toBe('');
  });

  it('should update the query signal immediately on onInput without waiting for debounce', () => {
    component.onInput('hello');
    expect(component.query()).toBe('hello');
  });

  it('should update the query signal on each successive call', () => {
    component.onInput('a');
    expect(component.query()).toBe('a');
    component.onInput('ab');
    expect(component.query()).toBe('ab');
  });

  it('should not emit searchChange before 300ms have elapsed', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    component.onInput('hello');
    vi.advanceTimersByTime(299);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit searchChange with the typed value after 300ms', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    component.onInput('hello');
    vi.advanceTimersByTime(300);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('hello');
  });

  it('should only emit once for rapid successive inputs (debounce consolidation)', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    component.onInput('a');
    component.onInput('ab');
    component.onInput('abc');
    vi.advanceTimersByTime(300);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('abc');
  });

  it('should cancel the pending timer on each new input', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    component.onInput('first');
    vi.advanceTimersByTime(150); // halfway through debounce

    component.onInput('second'); // resets timer
    vi.advanceTimersByTime(150); // not enough for the new timer

    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150); // now 300ms since 'second'
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('second');
  });

  it('should emit independently for inputs spaced more than 300ms apart', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    component.onInput('first');
    vi.advanceTimersByTime(300);

    component.onInput('second');
    vi.advanceTimersByTime(300);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'first');
    expect(spy).toHaveBeenNthCalledWith(2, 'second');
  });

  it('should emit an empty string when input is cleared', () => {
    const spy = vi.fn();
    component.searchChange.subscribe(spy);

    component.onInput('hello');
    vi.advanceTimersByTime(300);

    component.onInput('');
    vi.advanceTimersByTime(300);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenLastCalledWith('');
  });
});
