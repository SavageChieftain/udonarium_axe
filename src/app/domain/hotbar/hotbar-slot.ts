import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { ObjectNode } from '@axe/core/sync/object-node';
import { HotbarPayload, parseHotbarPayload } from '@axe/domain/hotbar/hotbar-payload';
import { HotbarSlotKind, toHotbarSlotKind } from '@axe/domain/hotbar/hotbar-slot-kind';

@SyncObject('hotbar-slot')
export class HotbarSlot extends ObjectNode {
  @SyncVar() page: number = 0;
  /** `index` belongs to ObjectNode, where it orders children. */
  @SyncVar() slotIndex: number = 0;
  @SyncVar() kind: string = 'chat';
  @SyncVar() label: string = '';
  @SyncVar() icon: string = '';
  @SyncVar() color: string = '';
  @SyncVar() payload: string = '';
  /** What the value pointed at when it was chosen, for a bar read in another room. */
  @SyncVar() valueName: string = '';
  /** Who the slot acts as. Empty means whoever is being controlled at the time. */
  @SyncVar() characterIdentifier: string = '';
  /** The name that piece went by, so a bar carried into another room can find it again. */
  @SyncVar() characterName: string = '';

  get pageNo(): number {
    return toCoordinate(this.page);
  }

  get slotNo(): number {
    return toCoordinate(this.slotIndex);
  }

  get slotKind(): HotbarSlotKind {
    return toHotbarSlotKind(this.kind);
  }

  get argument(): string {
    return `${this.value ?? ''}`;
  }

  get options(): HotbarPayload {
    return parseHotbarPayload(this.slotKind, this.payload);
  }

  isAt(page: number, slotIndex: number): boolean {
    return this.pageNo === page && this.slotNo === slotIndex;
  }
}

/** A hand-written save file can leave an attribute out, and an absent attribute reads back as ''. */
function toCoordinate(value: number | string): number {
  const held = Number(value);
  return Number.isFinite(held) && held >= 0 ? Math.floor(held) : 0;
}
