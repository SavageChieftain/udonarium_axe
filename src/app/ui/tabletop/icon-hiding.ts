import { DestroyRef, Signal, signal } from '@angular/core';

/** 触り終えてからアイコンを戻すまで(ms)。すぐ戻すと、動かすたびにちらつく。 */
const RESHOW_DELAY_MS = 300;

export interface IconHiding {
  /** いま隠しているか。 */
  readonly isHidden: Signal<boolean>;
  /** 触ったことを伝える。触り続けているあいだは隠れたまま。 */
  touch(): void;
}

/**
 * 駒を触っているあいだ、脇に出る操作アイコンを引っ込める。
 *
 * つまんで動かしている最中にアイコンが出ていると、狙った駒が隠れる。
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
