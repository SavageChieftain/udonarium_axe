import { defineSyncAttribute, defineSyncObject, defineSyncVariable } from '@axe/core/sync/decorator-core';
import { GameObject } from '@axe/core/sync/game-object';
import { Type } from '@axe/core/sync/object-factory';
import { ObjectNode } from '@axe/core/sync/object-node';

export function SyncObject(alias: string) {
  return <T extends GameObject>(constructor: Type<T>) => {
    defineSyncObject(alias)(constructor);
  };
}

export function SyncVar(alias?: string) {
  return <T extends GameObject>(target: T, key: string | symbol) => {
    if (target instanceof ObjectNode) {
      defineSyncAttribute(alias)(target, key);
    } else {
      defineSyncVariable(alias)(target, key);
    }
  };
}
