import { TranslateFn } from '@axe/application/i18n/translate.token';

const I18N_PREFIX = '@i18n:';
const SEP = ':';

export function encodeI18nMessage(key: string, params: Record<string, unknown> = {}): string {
  return I18N_PREFIX + key + SEP + JSON.stringify(params);
}

export function isI18nMessage(text: string | null | undefined): boolean {
  return typeof text === 'string' && text.startsWith(I18N_PREFIX);
}

export function decodeI18nMessage(text: string | null | undefined, t: TranslateFn): string {
  if (!isI18nMessage(text)) return text ?? '';
  const body = (text as string).slice(I18N_PREFIX.length);
  const sepIndex = body.indexOf(SEP);
  if (sepIndex < 0) return text as string;
  const key = body.slice(0, sepIndex);
  const paramsRaw = body.slice(sepIndex + 1);
  try {
    const params = JSON.parse(paramsRaw) as Record<string, unknown>;
    return t(key, params);
  } catch {
    return text as string;
  }
}
