import { DestroyRef, inject, Injectable, signal } from '@angular/core';

const KEYBOARD_INSET_PROPERTY = '--keyboard-inset';
const MIN_INSET_PX = 32;

@Injectable({ providedIn: 'root' })
export class KeyboardInsetService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly _inset = signal(0);
  readonly inset = this._inset.asReadonly();

  constructor() {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => this.apply(measureKeyboardInset(viewport, window.innerHeight));
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    update();

    this.destroyRef.onDestroy(() => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      this.apply(0);
    });
  }

  private apply(inset: number): void {
    this._inset.set(inset);
    document.documentElement.style.setProperty(KEYBOARD_INSET_PROPERTY, `${inset}px`);
  }
}

export function measureKeyboardInset(viewport: { height: number; offsetTop: number }, innerHeight: number): number {
  const hidden = Math.round(innerHeight - (viewport.height + viewport.offsetTop));
  return hidden < MIN_INSET_PX ? 0 : hidden;
}
