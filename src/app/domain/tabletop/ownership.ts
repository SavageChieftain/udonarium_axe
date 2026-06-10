import { getPeerContexts } from '@axe/core/network/peer-context-source';
import { ObjectNode } from '@axe/core/sync/object-node';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { OwnedTabletopObject } from '@axe/domain/tabletop/owned-tabletop-object';

export type OwnableObject = OwnedTabletopObject | GameTableMask;

type PeerContextLike = { userId: string; isOpen: boolean };

export function asOwnable(object: unknown): OwnableObject | null {
  return object instanceof OwnedTabletopObject || object instanceof GameTableMask ? object : null;
}

export function clearOwnership(objects: Iterable<unknown>): number {
  let count = 0;
  for (const object of objects) {
    const ownable = asOwnable(object);
    if (ownable && ownable.owner.length > 0) {
      ownable.owner = '';
      count++;
    }
  }
  return count;
}

export function clearOwnershipTree(root: ObjectNode): number {
  let count = clearOwnership([root]);
  for (const child of root.children) count += clearOwnershipTree(child);
  return count;
}

export function findOrphanedOwnership(
  objects: Iterable<unknown>,
  peerContexts: readonly PeerContextLike[] = getPeerContexts()
): OwnableObject[] {
  const orphaned: OwnableObject[] = [];
  for (const object of objects) {
    const ownable = asOwnable(object);
    if (ownable && ownable.owner.length > 0 && !peerContexts.some((p) => p.userId === ownable.owner && p.isOpen)) {
      orphaned.push(ownable);
    }
  }
  return orphaned;
}

export function releaseOrphanedOwnership(
  objects: Iterable<unknown>,
  peerContexts: readonly PeerContextLike[] = getPeerContexts()
): number {
  const orphaned = findOrphanedOwnership(objects, peerContexts);
  for (const object of orphaned) object.owner = '';
  return orphaned.length;
}
