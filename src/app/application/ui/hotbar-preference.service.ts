import { Injectable, signal } from '@angular/core';
import { HOTBAR_PAGES } from '@axe/domain/hotbar/hotbar-size';

const STORAGE_KEY = 'ui-hotbar';

interface HotbarPreference {
  page: number;
  /** Held where it stands, so a press cannot drag it about. */
  locked: boolean;
  /** Drawn above everything, the modal included. */
  pinned: boolean;
  showsLabel: boolean;
  showsHint: boolean;
}

const DEFAULT_PREFERENCE: HotbarPreference = {
  page: 0,
  locked: false,
  pinned: false,
  showsLabel: true,
  showsHint: true,
};

@Injectable({ providedIn: 'root' })
export class HotbarPreferenceService {
  private readonly held = signal<HotbarPreference>(storedPreference());

  readonly page = () => this.held().page;
  readonly locked = () => this.held().locked;
  readonly pinned = () => this.held().pinned;
  readonly showsLabel = () => this.held().showsLabel;
  readonly showsHint = () => this.held().showsHint;

  gotoPage(page: number): void {
    if (!Number.isFinite(page)) return;
    this.write({ page: Math.min(HOTBAR_PAGES - 1, Math.max(0, Math.floor(page))) });
  }

  turnPage(step: number): void {
    this.gotoPage((this.page() + step + HOTBAR_PAGES) % HOTBAR_PAGES);
  }

  setLocked(locked: boolean): void {
    this.write({ locked });
  }

  setPinned(pinned: boolean): void {
    this.write({ pinned });
  }

  setShowsLabel(showsLabel: boolean): void {
    this.write({ showsLabel });
  }

  setShowsHint(showsHint: boolean): void {
    this.write({ showsHint });
  }

  private write(patch: Partial<HotbarPreference>): void {
    const next = { ...this.held(), ...patch };
    this.held.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing refuses the write; the setting still holds for this session.
    }
  }
}

function storedPreference(): HotbarPreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCE };
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFERENCE };
    const held = parsed as Record<string, unknown>;
    const page = Number(held.page);
    return {
      page: Number.isFinite(page) ? Math.min(HOTBAR_PAGES - 1, Math.max(0, Math.floor(page))) : 0,
      locked: held.locked === true,
      pinned: held.pinned === true,
      showsLabel: held.showsLabel !== false,
      showsHint: held.showsHint !== false,
    };
  } catch {
    return { ...DEFAULT_PREFERENCE };
  }
}
