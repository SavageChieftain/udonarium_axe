import { inject, InjectionToken } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

export type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

export const TRANSLATE_FN = new InjectionToken<TranslateFn>('TRANSLATE_FN', {
  providedIn: 'root',
  factory: () => {
    const transloco = inject(TranslocoService);
    return (key, params) => transloco.translate(key, params);
  },
});
