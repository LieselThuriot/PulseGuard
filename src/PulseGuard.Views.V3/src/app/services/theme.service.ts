import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
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
      default: return 'bi-circle-half';
    }
  }
}
