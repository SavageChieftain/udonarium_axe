import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ViewportService } from '@axe/application/ui/viewport.service';

const STORAGE_KEY = 'ui-mobile-layout';

export const MIN_TABLE_RATIO = 0.2;
export const MAX_TABLE_RATIO = 0.85;
export const DEFAULT_TABLE_RATIO = 0.45;

export interface MobileLayoutState {
  readonly prefersDesktop: boolean;
  readonly tableRatio: number;
}

const DEFAULT_STATE: MobileLayoutState = { prefersDesktop: false, tableRatio: DEFAULT_TABLE_RATIO };

export function clampTableRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return DEFAULT_TABLE_RATIO;
  return Math.min(Math.max(ratio, MIN_TABLE_RATIO), MAX_TABLE_RATIO);
}

export function parseMobileLayoutState(raw: string | null): MobileLayoutState {
  if (!raw) return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(raw) as Partial<MobileLayoutState>;
    return {
      prefersDesktop: typeof parsed.prefersDesktop === 'boolean' ? parsed.prefersDesktop : DEFAULT_STATE.prefersDesktop,
      tableRatio: typeof parsed.tableRatio === 'number' ? clampTableRatio(parsed.tableRatio) : DEFAULT_STATE.tableRatio,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

@Injectable({ providedIn: 'root' })
export class MobileLayoutService {
  private readonly document = inject(DOCUMENT);
  private readonly viewport = inject(ViewportService);
  private readonly restored = parseMobileLayoutState(localStorage.getItem(STORAGE_KEY));

  readonly prefersDesktop = signal(this.restored.prefersDesktop);
  readonly tableRatio = signal(this.restored.tableRatio);

  readonly isActive = computed(() => this.viewport.isCompact() && !this.prefersDesktop());

  constructor() {
    effect(() => {
      this.document.body.classList.toggle('mobile-layout', this.isActive());
    });

    effect(() => {
      this.document.body.classList.toggle('touch-input', this.viewport.isTouch());
    });

    effect(() => {
      const state: MobileLayoutState = {
        prefersDesktop: this.prefersDesktop(),
        tableRatio: this.tableRatio(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* storage unavailable (private mode etc) — the layout just resets next time */
      }
    });
  }

  useDesktopLayout(): void {
    this.prefersDesktop.set(true);
  }

  useMobileLayout(): void {
    this.prefersDesktop.set(false);
  }

  setTableRatio(ratio: number): void {
    this.tableRatio.set(clampTableRatio(ratio));
  }
}
