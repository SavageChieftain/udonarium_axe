import { DestroyRef, inject, Injectable, signal } from '@angular/core';

export const COMPACT_VIEWPORT_QUERY = '(max-width: 767px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly _isCompact = signal(matchCompactViewport());
  readonly isCompact = this._isCompact.asReadonly();

  constructor() {
    const mql = window.matchMedia?.(COMPACT_VIEWPORT_QUERY);
    if (!mql) return;

    const listener = (event: MediaQueryListEvent) => this._isCompact.set(event.matches);
    mql.addEventListener('change', listener);
    this.destroyRef.onDestroy(() => mql.removeEventListener('change', listener));
  }
}

function matchCompactViewport(): boolean {
  return window.matchMedia?.(COMPACT_VIEWPORT_QUERY).matches ?? false;
}
