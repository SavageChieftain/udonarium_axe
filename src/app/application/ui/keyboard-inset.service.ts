import { DestroyRef, inject, Injectable, signal } from '@angular/core';

const MIN_INSET_PX = 32;

@Injectable({ providedIn: 'root' })
export class KeyboardInsetService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly _inset = signal(0);
  readonly inset = this._inset.asReadonly();

  private isWatching = false;

  initialize(): void {
    if (this.isWatching) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    this.isWatching = true;

    const update = () => this._inset.set(measureKeyboardInset(viewport, window.innerHeight));
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();

    this.destroyRef.onDestroy(() => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      this.isWatching = false;
    });
  }
}

export function measureKeyboardInset(
  viewport: { height: number; offsetTop: number; scale?: number },
  innerHeight: number
): number {
  if ((viewport.scale ?? 1) > 1.01) return 0;

  const hidden = Math.round(innerHeight - (viewport.height + viewport.offsetTop));
  return hidden < MIN_INSET_PX ? 0 : hidden;
}
