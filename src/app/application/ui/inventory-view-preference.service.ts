import { Injectable, signal } from '@angular/core';
import { type InventoryViewMode, isInventoryViewMode } from '@axe/domain/inventory/inventory-view-mode';

const STORAGE_KEY = 'ui-inventory-view';

/**
 * How this reader wants the inventory drawn.
 *
 * Kept here rather than in the room, since it is a way of looking rather than a decision about
 * the table: one player squinting at twelve enemies wants the table where another wants the
 * gauges.
 */
@Injectable({ providedIn: 'root' })
export class InventoryViewPreferenceService {
  readonly mode = signal<InventoryViewMode>(storedMode());

  set(mode: InventoryViewMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Private browsing refuses the write; the setting still holds for this session.
    }
  }
}

function storedMode(): InventoryViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isInventoryViewMode(stored) ? stored : 'rich';
  } catch {
    return 'rich';
  }
}
