import { EnvironmentProviders, importProvidersFrom, Provider } from '@angular/core';
import { TranslateFn } from '@axe/application/i18n/translate.token';
import { SUPPORTED_LANGS, SupportedLang } from '@axe/application/i18n/transloco.config';
import { Translation, TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const jaDict = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/i18n/ja.json'), 'utf-8')) as Translation;
const enDict = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/i18n/en.json'), 'utf-8')) as Translation;
const koDict = JSON.parse(readFileSync(resolve(process.cwd(), 'src/assets/i18n/ko.json'), 'utf-8')) as Translation;

const dictionaries: Record<SupportedLang, Translation> = { ja: jaDict, en: enDict, ko: koDict };

export function provideTranslocoTesting(): (Provider | EnvironmentProviders)[] {
  return [
    importProvidersFrom(
      TranslocoTestingModule.forRoot({
        langs: dictionaries,
        translocoConfig: {
          availableLangs: [...SUPPORTED_LANGS],
          defaultLang: 'ja',
          fallbackLang: 'ja',
        },
        preloadLangs: true,
      })
    ),
  ];
}

export function createSyncTranslate(lang: SupportedLang): TranslateFn {
  const dict = dictionaries[lang];
  return (key, params) => resolveKey(dict, key, params);
}

function resolveKey(dict: Translation, key: string, params?: Record<string, unknown>): string {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof cur !== 'string') return key;
  if (!params) return cur;
  return cur.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String(params[k] ?? `{{${k}}}`));
}
