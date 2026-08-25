import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'auto' | 'dark' | 'light';

const STORAGE_KEY = 'ui-theme';
const THEME_ORDER: Theme[] = ['auto', 'dark', 'light'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly theme = signal<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) ?? 'auto');

  private readonly systemPrefersDark = signal(window.matchMedia('(prefers-color-scheme: dark)').matches);

  /** The theme actually on screen, with 'auto' settled against what the system asks for. */
  readonly resolved = computed<Exclude<Theme, 'auto'>>(() => {
    const theme = this.theme();
    if (theme !== 'auto') return theme;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => this.systemPrefersDark.set(e.matches);
    mql.addEventListener('change', listener);
    this.destroyRef.onDestroy(() => mql.removeEventListener('change', listener));

    effect(() => {
      const t = this.theme();
      const html = this.document.documentElement;
      if (t === 'auto') {
        html.removeAttribute('data-theme');
      } else {
        html.setAttribute('data-theme', t);
      }
      const resolved = this.resolved();
      html.classList.toggle('theme-light', resolved === 'light');
      html.classList.toggle('theme-dark', resolved === 'dark');
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  cycle() {
    const idx = THEME_ORDER.indexOf(this.theme());
    this.theme.set(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }
}
