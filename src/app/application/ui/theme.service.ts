import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type Theme = 'auto' | 'dark' | 'light';

const STORAGE_KEY = 'ui-theme';
const THEME_ORDER: Theme[] = ['auto', 'dark', 'light'];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) ?? 'auto');

  constructor() {
    effect(() => {
      const t = this.theme();
      const html = this.document.documentElement;
      if (t === 'auto') {
        html.removeAttribute('data-theme');
      } else {
        html.setAttribute('data-theme', t);
      }
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  cycle() {
    const idx = THEME_ORDER.indexOf(this.theme());
    this.theme.set(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  }
}
