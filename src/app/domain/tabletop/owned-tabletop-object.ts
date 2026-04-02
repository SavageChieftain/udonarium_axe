import { Network } from '@axe/core/index';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

/**
 * Abstract base for TabletopObject subclasses that carry an `owner` (userId).
 * Consolidates the repeated ownerName / hasOwner / isMine / isOwnedBy /
 * ownerIsOnline / isOwnerOnline methods that were copy-pasted across
 * Card, CardStack, DiceSymbol and GameTableScratchMask.
 */
export abstract class OwnedTabletopObject extends TabletopObject {
  abstract owner: string;

  get ownerName(): string {
    const object = PeerCursor.findByUserId(this.owner);
    return object ? object.name : '';
  }

  get hasOwner(): boolean {
    return this.owner.length > 0;
  }

  get isMine(): boolean {
    return this.isOwnedBy(Network.peerContext.userId);
  }

  isOwnedBy(userId: string): boolean {
    return userId === this.owner;
  }

  get ownerIsOnline(): boolean {
    return this.isOwnerOnline(Network.peerContexts);
  }

  isOwnerOnline(peerContexts: { userId: string; isOpen: boolean }[]): boolean {
    return this.hasOwner && peerContexts.some((context) => context.userId === this.owner && context.isOpen);
  }
}
