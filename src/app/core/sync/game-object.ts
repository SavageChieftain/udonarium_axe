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

  update() {
    this.versionUp();
    ObjectStore.instance.update(this.identifier);
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
