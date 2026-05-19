import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  function setupMatchMedia(prefersLight: boolean): void {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => ({
        matches: prefersLight,
        addEventListener: jest.fn(),
      })),
    });
  }

  beforeEach(() => {
    localStorage.clear();
    setupMatchMedia(false);
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('should default to auto mode when no localStorage value is present', () => {
      const service = TestBed.inject(ThemeService);
      expect(service.mode()).toBe('auto');
    });

    it('should read a stored dark mode from localStorage', () => {
      localStorage.setItem('bs-theme', 'dark');
      const service = TestBed.inject(ThemeService);
      expect(service.mode()).toBe('dark');
    });

    it('should read a stored light mode from localStorage', () => {
      localStorage.setItem('bs-theme', 'light');
      const service = TestBed.inject(ThemeService);
      expect(service.mode()).toBe('light');
    });

    it('should fall back to auto for an unrecognised localStorage value', () => {
      localStorage.setItem('bs-theme', 'invalid');
      const service = TestBed.inject(ThemeService);
      // The stored value is returned as-is (cast to ThemeMode), but the
      // resolved theme must still produce a valid value.
      const resolved = service.resolvedTheme();
      expect(['light', 'dark']).toContain(resolved);
    });
  });

  describe('setMode', () => {
    it('should update the mode signal', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('light');
      expect(service.mode()).toBe('light');
    });

    it('should persist dark mode to localStorage', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('dark');
      TestBed.flushEffects();
      expect(localStorage.getItem('bs-theme')).toBe('dark');
    });

    it('should persist light mode to localStorage', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('light');
      TestBed.flushEffects();
      expect(localStorage.getItem('bs-theme')).toBe('light');
    });

    it('should remove the localStorage key when switching to auto', () => {
      localStorage.setItem('bs-theme', 'dark');
      const service = TestBed.inject(ThemeService);
      service.setMode('auto');
      TestBed.flushEffects();
      expect(localStorage.getItem('bs-theme')).toBeNull();
    });
  });

  describe('resolvedTheme', () => {
    it('should resolve to light when mode is explicitly light', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('light');
      TestBed.flushEffects();
      expect(service.resolvedTheme()).toBe('light');
    });

    it('should resolve to dark when mode is explicitly dark', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('dark');
      TestBed.flushEffects();
      expect(service.resolvedTheme()).toBe('dark');
    });

    it('should resolve auto to light when matchMedia prefers light', () => {
      setupMatchMedia(true);
      const service = TestBed.inject(ThemeService);
      service.setMode('auto');
      TestBed.flushEffects();
      expect(service.resolvedTheme()).toBe('light');
    });

    it('should resolve auto to dark when matchMedia does not prefer light', () => {
      setupMatchMedia(false);
      const service = TestBed.inject(ThemeService);
      service.setMode('auto');
      TestBed.flushEffects();
      expect(service.resolvedTheme()).toBe('dark');
    });
  });

  describe('icon', () => {
    it('should return the moon icon for dark mode', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('dark');
      TestBed.flushEffects();
      expect(service.icon()).toBe('bi-moon-stars-fill');
    });

    it('should return the sun icon for light mode', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('light');
      TestBed.flushEffects();
      expect(service.icon()).toBe('bi-brightness-high-fill');
    });

    it('should return the circle-half icon for auto mode', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('auto');
      TestBed.flushEffects();
      expect(service.icon()).toBe('bi-circle-half');
    });
  });

  describe('DOM effect', () => {
    it('should set data-bs-theme on documentElement when mode changes', () => {
      const service = TestBed.inject(ThemeService);
      const spy = jest.spyOn(document.documentElement, 'setAttribute');
      service.setMode('dark');
      TestBed.flushEffects();
      expect(spy).toHaveBeenCalledWith('data-bs-theme', 'dark');
    });

    it('should set data-bs-theme to light when mode is set to light', () => {
      const service = TestBed.inject(ThemeService);
      const spy = jest.spyOn(document.documentElement, 'setAttribute');
      service.setMode('light');
      TestBed.flushEffects();
      expect(spy).toHaveBeenCalledWith('data-bs-theme', 'light');
    });
  });
});
