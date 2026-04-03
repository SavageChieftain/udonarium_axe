import { EventChannel } from '@axe/core/event/event-channel';
import { Network } from '@axe/core/network/network';
import { localDispatch } from '@axe/core/network/network-messaging';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectNode } from '@axe/core/sync/object-node';

export interface ObjectChangeEvent {
  identifier: string;
  aliasName: string;
  isSendFromSelf: boolean;
}

export interface ChildrenChangeEvent {
  identifier: string;
}

/** EventChannel for batched object change events. Shared with ObjectChangeService. */
export const objectChanged$ = new EventChannel<ObjectChangeEvent>();
/** EventChannel for batched children-change events. Shared with ObjectChangeService. */
export const childrenChanged$ = new EventChannel<ChildrenChangeEvent>();

export interface ObjectStoreEvent {
  identifier: string;
  aliasName: string;
}

/** Emitted synchronously when ObjectStore.add() succeeds. */
export const objectAdded$ = new EventChannel<ObjectStoreEvent>();
/** Emitted synchronously when ObjectStore.remove() succeeds. */
export const objectRemoved$ = new EventChannel<ObjectStoreEvent>();

const objectBatches = new Map<string, { object: GameObject; originFrom: string }>();
const nodeBatches = new Set<string>();

let isBatching = false;

export function markForChanged(object: GameObject, sendFrom: string = Network.peerId) {
  if (!object) return;
  objectBatches.set(object.identifier, {
    object,
    originFrom: sendFrom,
  });
  if (object instanceof ObjectNode) markForChildrenChanged(object.parent);

  startBatching();
}

export function markForChildrenChanged(node: ObjectNode | null) {
  let current = node;
  while (current) {
    nodeBatches.add(current.identifier);
    current = current.parent;
    if (current === node) break;
  }

  startBatching();
}

function startBatching() {
  if (!isBatching) {
    queueMicrotask(triggerEvent);
    isBatching = true;
  }
}

const triggerEvent = () => {
  isBatching = false;
  const objects = [...objectBatches.values()];
  const nodes = [...nodeBatches];
  objectBatches.clear();
  nodeBatches.clear();

  for (const data of objects) {
    objectChanged$.emit({
      aliasName: data.object.aliasName,
      identifier: data.object.identifier,
      isSendFromSelf: data.originFrom === Network.peerId,
    });
  }

  for (const identifier of nodes) {
    childrenChanged$.emit({ identifier });
  }

  if (objects.length > 0 || nodes.length > 0) {
    localDispatch('LOCAL_OBJECT_UPDATED', null);
  }
};
