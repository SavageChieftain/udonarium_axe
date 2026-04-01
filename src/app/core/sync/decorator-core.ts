import { GameObject } from '@axe/core/sync/game-object';
import { ObjectFactory, Type } from '@axe/core/sync/object-factory';
import { ObjectNode } from '@axe/core/sync/object-node';

export function defineSyncObject(alias: string) {
  return <T extends GameObject>(constructor: Type<T>) => {
    ObjectFactory.instance.register(constructor, alias);
  };
}

export function defineSyncVariable(syncKey?: string | symbol) {
  return <T extends GameObject>(target: T, key: string | symbol) => {
    const dataKey = syncKey ?? key;

    function getter(this: { context: { syncData: Record<string | symbol, unknown> } }) {
      return this.context.syncData[dataKey];
    }

    function setter(this: { context: { syncData: Record<string | symbol, unknown> }; update(): void }, value: unknown) {
      this.context.syncData[dataKey] = value;
      this.update();
    }

    Object.defineProperty(target, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}

export function defineSyncAttribute(syncKey?: string | symbol) {
  return <T extends ObjectNode>(target: T, key: string | symbol) => {
    const attrName = (syncKey ?? key) as string;

    function getter(this: { getAttribute(name: string): string }) {
      return this.getAttribute(attrName);
    }

    function setter(this: { setAttribute(name: string, value: number | string): void }, value: number | string) {
      this.setAttribute(attrName, value);
    }

    Object.defineProperty(target, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
