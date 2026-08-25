import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import {
  detectInitialLang,
  isSupportedLang,
  SUPPORTED_LANGS,
  SupportedLang,
  TRANSLOCO_LANG_STORAGE_KEY,
} from '@axe/application/i18n/transloco.config';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly _currentLang = signal<SupportedLang>('ja');
  readonly currentLang = this._currentLang.asReadonly();
  readonly availableLangs = computed(() => [...SUPPORTED_LANGS]);

  constructor() {
    this.transloco.langChanges$.subscribe((lang) => {
      if (!isSupportedLang(lang)) return;
      this._currentLang.set(lang);
      this.document.documentElement.lang = lang;
    });
  }

  async initialize(): Promise<void> {
    const initial = detectInitialLang();
    this.transloco.setActiveLang(initial);
    await firstValueFrom(this.transloco.load(initial));
    this._currentLang.set(initial);
  }

  async setLang(lang: SupportedLang): Promise<void> {
    await firstValueFrom(this.transloco.load(lang));
    this.transloco.setActiveLang(lang);
    try {
      localStorage.setItem(TRANSLOCO_LANG_STORAGE_KEY, lang);
    } catch {
      /* localStorage unavailable (private mode, SSR etc) — silently ignore */
    }
  }

  async toggle(): Promise<void> {
    const langs = this.availableLangs();
    const index = langs.indexOf(this._currentLang());
    await this.setLang(langs[(index + 1) % langs.length]);
  }
}
