import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';

export type MotionSetting = 'auto' | 'on' | 'off';

const STORAGE_KEY = 'ui-motion';
const MOTION_ORDER: MotionSetting[] = ['auto', 'on', 'off'];
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Whether effects may animate.
 *
 * The system's reduced-motion setting is the default, not the last word. Windows turns it on
 * to make the desktop cheaper to draw, which is a different wish from wanting the table still.
 */
@Injectable({ providedIn: 'root' })
export class MotionService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly setting = signal<MotionSetting>(storedSetting());

  private readonly systemPrefersReduced = signal(mediaQuery()?.matches ?? false);

  readonly enabled = computed<boolean>(() => {
    const setting = this.setting();
    if (setting === 'on') return true;
    if (setting === 'off') return false;
    return !this.systemPrefersReduced();
  });

  constructor() {
    const mql = mediaQuery();
    if (mql) {
      const listener = (event: MediaQueryListEvent) => this.systemPrefersReduced.set(event.matches);
      mql.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => mql.removeEventListener('change', listener));
    }

    this.apply();
    effect(() => this.apply());
  }

  cycle(): void {
    const index = MOTION_ORDER.indexOf(this.setting());
    this.setting.set(MOTION_ORDER[(index + 1) % MOTION_ORDER.length]);
  }

  private apply(): void {
    this.document.documentElement.classList.toggle('motion-reduced', !this.enabled());
    try {
      localStorage.setItem(STORAGE_KEY, this.setting());
    } catch {
      // Private browsing refuses the write; the setting still holds for this session.
    }
  }
}

function mediaQuery(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia(REDUCED_MOTION_QUERY) : null;
}

function storedSetting(): MotionSetting {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MOTION_ORDER.includes(stored as MotionSetting) ? (stored as MotionSetting) : 'auto';
  } catch {
    return 'auto';
  }
}
