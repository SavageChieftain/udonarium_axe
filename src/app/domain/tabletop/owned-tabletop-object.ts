import { getPeerContext, getPeerContexts } from '@axe/core/network/peer-context-source';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

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
    return this.isOwnedBy(getPeerContext().userId);
  }

  isOwnedBy(userId: string): boolean {
    return userId === this.owner;
  }

  get ownerIsOnline(): boolean {
    return this.isOwnerOnline(getPeerContexts());
  }

  isOwnerOnline(peerContexts: { userId: string; isOpen: boolean }[]): boolean {
    return this.hasOwner && peerContexts.some((context) => context.userId === this.owner && context.isOpen);
  }
}
