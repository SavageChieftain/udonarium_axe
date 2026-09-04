import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { generateUuid } from '@axe/core/util/uuid';

export interface ObjectContext {
  aliasName: string;
  identifier: string;
  majorVersion: number;
  minorVersion: number;
  syncData: Record<string | symbol, unknown>;
}

export class GameObject {
  /** Called after every update() invocation. Set externally (e.g. object-event-extension.ts) to hook local change notifications. */
  static onUpdate: ((object: GameObject) => void) | null = null;

  private context: ObjectContext = {
    aliasName: (this.constructor as typeof GameObject).aliasName,
    identifier: '',
    majorVersion: 0,
    minorVersion: 0,
    syncData: {},
  };

  static get aliasName(): string {
    return ObjectFactory.instance.getAlias(this);
  }
  get aliasName() {
    return this.context.aliasName;
  }
  get identifier() {
    return this.context.identifier;
  }
  get version() {
    return this.context.majorVersion + this.context.minorVersion;
  }

  constructor(identifier: string = generateUuid()) {
    this.context.identifier = identifier;
  }

  initialize() {
    ObjectStore.instance.add(this);
  }

  destroy() {
    ObjectStore.instance.delete(this);
  }

  // GameObject Lifecycle
  onStoreAdded() {}

  // GameObject Lifecycle
  onStoreRemoved() {}

  /**
   * Runs a piece of work with every change it makes counted as one.
   *
   * Filling an object in field by field says the object changed once per field, and each of
   * those clones everything the object holds so it can be sent. Seeding a room writes
   * thousands of fields into a few dozen objects, and every one of them paid that. Inside a
   * batch the objects are only remembered; when the outermost batch ends each of them says
   * it changed, once.
   */
  static batch<T>(work: () => T): T {
    GameObject.batching += 1;
    try {
      return work();
    } finally {
      GameObject.batching -= 1;
      if (GameObject.batching === 0) GameObject.flushBatch();
    }
  }

  private static batching = 0;
  private static batched: GameObject[] = [];

  private static flushBatch(): void {
    const changed = GameObject.batched;
    GameObject.batched = [];
    for (const object of changed) object.batchPending = false;

    let failure: { reason: unknown } | null = null;
    for (const object of changed) {
      try {
        object.announce();
      } catch (reason) {
        failure ??= { reason };
      }
    }
    if (failure) throw failure.reason;
  }

  update() {
    if (GameObject.batching > 0) {
      if (!this.batchPending) {
        this.batchPending = true;
        GameObject.batched.push(this);
      }
      return;
    }
    this.announce();
  }

  private batchPending = false;

  private announce(): void {
    this.versionUp();
    ObjectStore.instance.update(this.identifier);
    GameObject.onUpdate?.(this);
  }

  private versionUp() {
    this.context.majorVersion += 1;
    this.context.minorVersion = Math.random();
  }

  apply(context: ObjectContext | null) {
    if (context !== null && this.identifier === context.identifier) {
      this.context.majorVersion = context.majorVersion;
      this.context.minorVersion = context.minorVersion;
      this.context.syncData = context.syncData;
    }
  }

  clone(): this {
    const xmlString = this.toXml();
    return ObjectSerializer.instance.parseXml(xmlString)! as this;
  }

  get majorVersion(): number {
    return this.context.majorVersion;
  }

  toContext(): ObjectContext {
    return {
      aliasName: this.context.aliasName,
      identifier: this.context.identifier,
      majorVersion: this.context.majorVersion,
      minorVersion: this.context.minorVersion,
      syncData: structuredClone(this.context.syncData),
    };
  }

  toXml(): string {
    return ObjectSerializer.instance.toXml(this);
  }
}
