import { effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'chat-auto-follow-scroll';

@Injectable({ providedIn: 'root' })
export class ChatPreferencesService {
  readonly autoFollowScroll = signal<boolean>(readInitialAutoFollow());

  constructor() {
    effect(() => {
      const v = this.autoFollowScroll();
      try {
        localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
      } catch {
        /* localStorage unavailable (private mode, SSR etc) — silently ignore */
      }
    });
  }

  setAutoFollowScroll(v: boolean): void {
    this.autoFollowScroll.set(v);
  }
}

function readInitialAutoFollow(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v == null ? true : v === '1';
  } catch {
    return true;
  }
}
