import { Network } from '@axe/core/network/network';
import { localDispatch } from '@axe/core/network/network-messaging';
import { Subject } from 'rxjs';

import { GameObject } from './game-object';
import { ObjectNode } from './object-node';

export interface ObjectChangeEvent {
  identifier: string;
  aliasName: string;
  isSendFromSelf: boolean;
}

export interface ChildrenChangeEvent {
  identifier: string;
}

/** RxJS Subject for batched object change events. Shared with ObjectChangeService. */
export const objectChanged$ = new Subject<ObjectChangeEvent>();
/** RxJS Subject for batched children-change events. Shared with ObjectChangeService. */
export const childrenChanged$ = new Subject<ChildrenChangeEvent>();

export interface ObjectStoreEvent {
  identifier: string;
  aliasName: string;
}

/** Emitted synchronously when ObjectStore.add() succeeds. */
export const objectAdded$ = new Subject<ObjectStoreEvent>();
/** Emitted synchronously when ObjectStore.remove() succeeds. */
export const objectRemoved$ = new Subject<ObjectStoreEvent>();

const objectBatches = new Map<string, { object: GameObject; originFrom: string }>();
const nodeBatches = new Set<string>();

let isBatching = false;

export function markForChanged(object: GameObject, sendFrom: string = Network.peerId) {
  objectBatches.set(object.identifier, {
    object: object,
    originFrom: sendFrom,
  });
  if (object instanceof ObjectNode) markForChildrenChanged(object.parent);

  startBatching();
}

export function markForChildrenChanged(node: ObjectNode) {
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
  const objects = Array.from(objectBatches.values());
  const nodes = Array.from(nodeBatches.values());
  objectBatches.clear();
  nodeBatches.clear();

  for (const data of objects) {
    const context = {
      aliasName: data.object.aliasName,
      identifier: data.object.identifier,
    };
    const isSendFromSelf = data.originFrom === Network.peerId;
    objectChanged$.next({ ...context, isSendFromSelf });
  }

  for (const identifier of nodes) {
    childrenChanged$.next({ identifier });
  }

  if (objects.length > 0 || nodes.length > 0) {
    localDispatch('LOCAL_OBJECT_UPDATED', null);
  }
};
