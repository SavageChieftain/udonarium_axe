import { environment } from '@env/environment';
import { TranslocoConfig } from '@jsverse/transloco';

export const SUPPORTED_LANGS = ['ja', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const TRANSLOCO_LANG_STORAGE_KEY = 'ui-lang';

export const transLocoConfig: Partial<TranslocoConfig> = {
  availableLangs: [...SUPPORTED_LANGS],
  defaultLang: 'ja',
  fallbackLang: 'ja',
  reRenderOnLangChange: true,
  prodMode: environment.production,
};

export function detectInitialLang(): SupportedLang {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(TRANSLOCO_LANG_STORAGE_KEY) : null;
  if (isSupportedLang(stored)) return stored;
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export function isSupportedLang(value: unknown): value is SupportedLang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}
