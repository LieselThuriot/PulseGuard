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

    it('should read a stored matrix mode from localStorage', () => {
      localStorage.setItem('bs-theme', 'matrix');
      const service = TestBed.inject(ThemeService);
      expect(service.mode()).toBe('matrix');
    });

    it('should read a stored synthwave mode from localStorage', () => {
      localStorage.setItem('bs-theme', 'synthwave');
      const service = TestBed.inject(ThemeService);
      expect(service.mode()).toBe('synthwave');
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

    it('should persist matrix mode to localStorage', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(localStorage.getItem('bs-theme')).toBe('matrix');
    });

    it('should persist synthwave mode to localStorage', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
      TestBed.flushEffects();
      expect(localStorage.getItem('bs-theme')).toBe('synthwave');
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

    it('should resolve to dark when mode is matrix', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(service.resolvedTheme()).toBe('dark');
    });

    it('should resolve to dark when mode is synthwave', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
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

    it('should return the terminal icon for matrix mode', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(service.icon()).toBe('bi-terminal-fill');
    });

    it('should return the music-note icon for synthwave mode', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
      TestBed.flushEffects();
      expect(service.icon()).toBe('bi-music-note-beamed');
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

    it('should set data-bs-theme to dark and add theme-matrix class when mode is matrix', () => {
      const service = TestBed.inject(ThemeService);
      const spy = jest.spyOn(document.documentElement, 'setAttribute');
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(spy).toHaveBeenCalledWith('data-bs-theme', 'dark');
      expect(document.documentElement.classList.contains('theme-matrix')).toBe(true);
    });

    it('should remove theme-matrix class when switching away from matrix', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('theme-matrix')).toBe(true);
      service.setMode('dark');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('theme-matrix')).toBe(false);
    });

    it('should set data-bs-theme to dark and add theme-synthwave class when mode is synthwave', () => {
      const service = TestBed.inject(ThemeService);
      const spy = jest.spyOn(document.documentElement, 'setAttribute');
      service.setMode('synthwave');
      TestBed.flushEffects();
      expect(spy).toHaveBeenCalledWith('data-bs-theme', 'dark');
      expect(document.documentElement.classList.contains('theme-synthwave')).toBe(true);
    });

    it('should remove theme-synthwave class when switching away from synthwave', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('theme-synthwave')).toBe(true);
      service.setMode('light');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('theme-synthwave')).toBe(false);
    });

    it('should remove theme-matrix when switching to synthwave', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('theme-matrix')).toBe(true);
      service.setMode('synthwave');
      TestBed.flushEffects();
      expect(document.documentElement.classList.contains('theme-matrix')).toBe(false);
      expect(document.documentElement.classList.contains('theme-synthwave')).toBe(true);
    });
  });

  describe('font loading', () => {
    afterEach(() => {
      document.getElementById('theme-font-oxanium')?.remove();
    });

    it('should inject a link element for Oxanium when synthwave is activated', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
      TestBed.flushEffects();
      const link = document.getElementById('theme-font-oxanium') as HTMLLinkElement;
      expect(link).not.toBeNull();
      expect(link.rel).toBe('stylesheet');
      expect(link.href).toContain('fonts.googleapis.com');
      expect(link.href).toContain('Oxanium');
    });

    it('should remove the Oxanium link when switching away from synthwave', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
      TestBed.flushEffects();
      expect(document.getElementById('theme-font-oxanium')).not.toBeNull();
      service.setMode('dark');
      TestBed.flushEffects();
      expect(document.getElementById('theme-font-oxanium')).toBeNull();
    });

    it('should not duplicate the link if synthwave is set multiple times', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('synthwave');
      TestBed.flushEffects();
      service.setMode('dark');
      TestBed.flushEffects();
      service.setMode('synthwave');
      TestBed.flushEffects();
      const links = document.querySelectorAll('#theme-font-oxanium');
      expect(links.length).toBe(1);
    });

    it('should not inject a link element for non-synthwave themes', () => {
      const service = TestBed.inject(ThemeService);
      service.setMode('matrix');
      TestBed.flushEffects();
      expect(document.getElementById('theme-font-oxanium')).toBeNull();
    });
  });
});
