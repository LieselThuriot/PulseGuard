import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'auto' | 'matrix' | 'synthwave';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private static readonly THEME_CLASSES = ['theme-matrix', 'theme-synthwave'] as const;
  private static readonly OXANIUM_URL = 'https://fonts.googleapis.com/css2?family=Oxanium:wght@300;400;500;600;700&display=swap';
  private static readonly OXANIUM_ID = 'theme-font-oxanium';

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly mode = signal<ThemeMode>(this.getStoredMode());
  readonly resolvedTheme = signal<'light' | 'dark'>(this.resolveTheme(this.getStoredMode()));
  readonly icon = signal<string>(this.getIcon(this.getStoredMode()));

  constructor() {
    effect(() => {
      const mode = this.mode();
      const resolved = this.resolveTheme(mode);
      this.resolvedTheme.set(resolved);
      this.icon.set(this.getIcon(mode));

      if (this.isBrowser) {
        document.documentElement.setAttribute('data-bs-theme', resolved);

        // Remove all custom theme classes, then add the active one
        document.documentElement.classList.remove(...ThemeService.THEME_CLASSES);
        const themeClass = `theme-${mode}`;
        if (ThemeService.THEME_CLASSES.includes(themeClass as any)) {
          document.documentElement.classList.add(themeClass);
        }

        // Load/unload theme-specific fonts
        this.toggleFont(mode === 'synthwave');

        if (mode === 'auto') {
          localStorage.removeItem('bs-theme');
        } else {
          localStorage.setItem('bs-theme', mode);
        }
      }
    });

    if (this.isBrowser) {
      window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
        if (this.mode() === 'auto') {
          this.resolvedTheme.set(this.resolveTheme('auto'));
          document.documentElement.setAttribute('data-bs-theme', this.resolvedTheme());
        }
      });
    }
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  private getStoredMode(): ThemeMode {
    if (!this.isBrowser) return 'auto';
    return (localStorage.getItem('bs-theme') as ThemeMode) || 'auto';
  }

  private resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'auto') {
      if (!this.isBrowser) return 'dark';
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return mode === 'light' ? 'light' : 'dark';
  }

  private getIcon(mode: ThemeMode): string {
    switch (mode) {
      case 'dark': return 'bi-moon-stars-fill';
      case 'light': return 'bi-brightness-high-fill';
      case 'matrix': return 'bi-terminal-fill';
      case 'synthwave': return 'bi-music-note-beamed';
      default: return 'bi-circle-half';
    }
  }

  private toggleFont(load: boolean): void {
    const existing = document.getElementById(ThemeService.OXANIUM_ID);
    if (load && !existing) {
      const link = document.createElement('link');
      link.id = ThemeService.OXANIUM_ID;
      link.rel = 'stylesheet';
      link.href = ThemeService.OXANIUM_URL;
      document.head.appendChild(link);
    } else if (!load && existing) {
      existing.remove();
    }
  }
}
