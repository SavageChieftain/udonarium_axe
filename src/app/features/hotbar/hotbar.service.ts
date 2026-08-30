import { Injectable, signal } from '@angular/core';
import { HotbarSlotDraft } from '@axe/domain/hotbar/hotbar-draft';
import { HotbarCell } from '@axe/domain/hotbar/hotbar-size';

export interface RemovedHotbarSlot {
  cell: HotbarCell;
  draft: HotbarSlotDraft;
}

/** What the bar is carrying about this session: a slot on its way somewhere, and the last one cleared. */
@Injectable({ providedIn: 'root' })
export class HotbarService {
  private readonly held = signal<HotbarSlotDraft | null>(null);
  private readonly removed = signal<RemovedHotbarSlot | null>(null);

  readonly clipboard = this.held.asReadonly();
  readonly lastRemoved = this.removed.asReadonly();

  copy(draft: HotbarSlotDraft): void {
    this.held.set({ ...draft });
  }

  rememberRemoved(cell: HotbarCell, draft: HotbarSlotDraft): void {
    this.removed.set({ cell: { ...cell }, draft: { ...draft } });
  }

  takeRemoved(): RemovedHotbarSlot | null {
    const held = this.removed();
    this.removed.set(null);
    return held;
  }
}
