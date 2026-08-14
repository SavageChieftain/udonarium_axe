import { DestroyRef, Signal, signal } from '@angular/core';

/** How long after a touch before the icon returns, in ms. Returning at once flickers on every move. */
const RESHOW_DELAY_MS = 300;

export interface IconHiding {
  /** Whether it is hidden right now. */
  readonly isHidden: Signal<boolean>;
  /** Reports a touch. It stays hidden for as long as the touching continues. */
  touch(): void;
}

/**
 * Pulls the handle icons out of the way while a piece is being touched.
 *
 * Icons showing mid-drag cover the very piece being aimed at.
 */
export function hideIconWhileTouched(destroyRef: DestroyRef): IconHiding {
  const isHidden = signal(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  destroyRef.onDestroy(() => clearTimeout(timer ?? undefined));

  return {
    isHidden: isHidden.asReadonly(),
    touch(): void {
      clearTimeout(timer ?? undefined);
      timer = setTimeout(() => {
        timer = null;
        isHidden.set(false);
      }, RESHOW_DELAY_MS);
      isHidden.set(true);
    },
  };
}
