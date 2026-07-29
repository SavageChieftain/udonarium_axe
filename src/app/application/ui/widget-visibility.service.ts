import { effect, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ui-widgets';

export interface WidgetVisibility {
  readonly clock: boolean;
  readonly miniPlayer: boolean;
}

const DEFAULT_VISIBILITY: WidgetVisibility = { clock: false, miniPlayer: true };

export function parseWidgetVisibility(raw: string | null): WidgetVisibility {
  if (!raw) return DEFAULT_VISIBILITY;
  try {
    const parsed = JSON.parse(raw) as Partial<WidgetVisibility>;
    return {
      clock: typeof parsed.clock === 'boolean' ? parsed.clock : DEFAULT_VISIBILITY.clock,
      miniPlayer: typeof parsed.miniPlayer === 'boolean' ? parsed.miniPlayer : DEFAULT_VISIBILITY.miniPlayer,
    };
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

@Injectable({ providedIn: 'root' })
export class WidgetVisibilityService {
  private readonly restored = parseWidgetVisibility(localStorage.getItem(STORAGE_KEY));

  readonly clock = signal(this.restored.clock);
  readonly miniPlayer = signal(this.restored.miniPlayer);

  constructor() {
    effect(() => {
      const state: WidgetVisibility = { clock: this.clock(), miniPlayer: this.miniPlayer() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    });
  }

  toggleClock(): void {
    this.clock.update((visible) => !visible);
  }

  toggleMiniPlayer(): void {
    this.miniPlayer.update((visible) => !visible);
  }
}
