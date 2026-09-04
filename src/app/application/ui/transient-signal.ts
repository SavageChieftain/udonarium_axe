import { DestroyRef, inject, Signal, signal } from '@angular/core';

export interface TransientSignal<T> extends Signal<T> {
  show(value: T, holdMs?: number): void;
  clear(): void;
}

export function transientSignal<T>(resting: T, holdMs: number): TransientSignal<T> {
  const inner = signal<T>(resting);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const show = (value: T, ms = holdMs) => {
    cancel();
    inner.set(value);
    timer = setTimeout(() => {
      timer = null;
      inner.set(resting);
    }, ms);
  };

  const clear = () => {
    cancel();
    inner.set(resting);
  };

  inject(DestroyRef).onDestroy(cancel);
  return Object.assign(inner.asReadonly(), { show, clear });
}
