import { networkSend } from '@axe/core/network/network-messaging';
import { GameObject, ObjectContext } from '@axe/core/sync/game-object';
import { objectAdded$, objectRemoved$ } from '@axe/core/sync/object-event-extension';
import { Type } from '@axe/core/sync/object-factory';
import { setZeroTimeout } from '@axe/core/util/zero-timeout';

type ObjectAliasName = string;
type ObjectIdentifier = string;
type TimeStamp = number;

export type CatalogItem = { identifier: string; version: number };

export class ObjectStore {
  private static _instance: ObjectStore;
  static get instance(): ObjectStore {
    if (!ObjectStore._instance) ObjectStore._instance = new ObjectStore();
    return ObjectStore._instance;
  }

  private identifierMap: Map<ObjectIdentifier, GameObject> = new Map();
  private aliasNameMap: Map<ObjectAliasName, Map<ObjectIdentifier, GameObject>> = new Map();
  private garbageMap: Map<ObjectIdentifier, TimeStamp> = new Map();

  private queueMap: Map<ObjectIdentifier, ObjectContext> = new Map();
  private updateInterval: number | null = null;
  private garbageCollectionInterval: NodeJS.Timeout | null = null;
  private updateCallback = () => {
    this.updateQueue();
  };

  private constructor() {}

  add(object: GameObject, shouldBroadcast: boolean = true): GameObject {
    if (this.get(object.identifier) != null || this.isDeleted(object.identifier)) return null!;
    this.identifierMap.set(object.identifier, object);
    let objectsMap = this.aliasNameMap.get(object.aliasName);
    if (!objectsMap) {
      objectsMap = new Map();
      this.aliasNameMap.set(object.aliasName, objectsMap);
    }
    objectsMap.set(object.identifier, object);
    object.onStoreAdded();
    if (shouldBroadcast) this.update(object.toContext());
    objectAdded$.next({ identifier: object.identifier, aliasName: object.aliasName });
    return object;
  }

  remove(object: GameObject): GameObject {
    if (!this.identifierMap.has(object.identifier)) return null!;

    this.identifierMap.delete(object.identifier);
    const objectsMap = this.aliasNameMap.get(object.aliasName);
    if (objectsMap) objectsMap.delete(object.identifier);
    object.onStoreRemoved();
    objectRemoved$.next({ identifier: object.identifier, aliasName: object.aliasName });
    return object;
  }

  delete(object: GameObject, shouldBroadcast?: boolean): GameObject;
  delete(identifier: string, shouldBroadcast?: boolean): GameObject;
  delete(arg: GameObject | string, shouldBroadcast: boolean = true) {
    let object: GameObject;
    let identifier: string;
    if (typeof arg === 'string') {
      object = this.get(arg);
      identifier = arg;
    } else {
      object = arg;
      identifier = arg.identifier;
    }
    this.markForDelete(identifier);
    return object == null ? null! : this._delete(object, shouldBroadcast);
  }

  private _delete(object: GameObject, shouldBroadcast: boolean): GameObject {
    if (this.remove(object) === null) return null!;
    if (shouldBroadcast)
      networkSend('DELETE_GAME_OBJECT', {
        aliasName: object.aliasName,
        identifier: object.identifier,
      });

    return object;
  }

  private markForDelete(identifier: string) {
    this.garbageMap.set(identifier, performance.now());
    this.garbageCollection(10 * 60 * 1000);
  }

  get<T extends GameObject>(identifier: string): T {
    return this.identifierMap.has(identifier) ? (this.identifierMap.get(identifier) as T) : null!;
  }

  getObjects<T extends GameObject>(constructor: Type<T>): T[];
  getObjects<T extends GameObject>(aliasName: string): T[];
  getObjects<T extends GameObject>(): T[];
  getObjects<T extends GameObject>(arg?: string | Type<T>): T[] {
    if (arg == null) {
      return <T[]>Array.from(this.identifierMap.values());
    }
    let aliasName: string;
    if (typeof arg === 'string') {
      aliasName = arg;
    } else {
      aliasName = arg.aliasName ?? '';
    }

    const objectsMap = this.aliasNameMap.get(aliasName);
    return objectsMap ? <T[]>Array.from(objectsMap.values()) : [];
  }

  update(identifier: string): void;
  update(context: ObjectContext): void;
  update(arg: string | ObjectContext) {
    let context: ObjectContext | null = null;
    if (typeof arg === 'string') {
      const object: GameObject = this.get(arg);
      if (object) context = object.toContext();
    } else {
      context = arg;
    }
    if (!context) return;

    if (this.queueMap.has(context.identifier)) {
      const queue = this.queueMap.get(context.identifier)!;
      for (const key in context) {
        (queue as unknown as Record<string, unknown>)[key] = (context as unknown as Record<string, unknown>)[key];
      }
      return;
    }
    networkSend('UPDATE_GAME_OBJECT', context);
    this.queueMap.set(context.identifier, context);
    if (this.updateInterval === null) {
      this.updateInterval = setZeroTimeout(this.updateCallback);
    }
  }

  private updateQueue() {
    this.queueMap.clear();
    this.updateInterval = null;
  }

  isDeleted(identifier: string) {
    const timeStamp = this.garbageMap.get(identifier);
    return timeStamp != null;
  }

  getCatalog(): CatalogItem[] {
    const catalog: CatalogItem[] = [];
    for (const object of this.identifierMap.values()) {
      catalog.push({ identifier: object.identifier, version: object.version });
    }
    return catalog;
  }

  clearDeleteHistory() {
    this.garbageMap.clear();
  }

  private garbageCollection(garbage: ObjectContext): void;
  private garbageCollection(ms: number): void;
  private garbageCollection(arg: ObjectContext | number) {
    if (typeof arg === 'number') {
      if (this.garbageCollectionInterval === null) {
        this.garbageCollectionInterval = setTimeout(() => {
          this.garbageCollectionInterval = null;
        }, 1000);
        this._garbageCollection(arg);
      }
    } else {
      this.garbageMap.delete(arg.identifier);
    }
  }

  private _garbageCollection(ms: number) {
    const nowDate = performance.now();

    let checkLength = this.garbageMap.size - 100000;
    if (checkLength <= 0) return;

    const entries = this.garbageMap.entries();
    while (checkLength > 0) {
      checkLength--;
      const item = entries.next();
      if (item.done) break;

      const identifier = item.value[0];
      const timeStamp = item.value[1];

      if (timeStamp + ms > nowDate) continue;
      this.garbageMap.delete(identifier);
    }
  }
}
