import { GameObject } from './game-object';
import { ObjectFactory, Type } from './object-factory';
import { ObjectNode } from './object-node';

export function defineSyncObject(alias: string) {
  return <T extends GameObject>(constructor: Type<T>) => {
    ObjectFactory.instance.register(constructor, alias);
  };
}

export function defineSyncVariable() {
  return <T extends GameObject>(target: T, key: string | symbol) => {
    function getter(this: { context: { syncData: Record<string | symbol, unknown> } }) {
      return this.context.syncData[key];
    }

    function setter(this: { context: { syncData: Record<string | symbol, unknown> }; update(): void }, value: unknown) {
      this.context.syncData[key] = value;
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

export function defineSyncAttribute() {
  return <T extends ObjectNode>(target: T, key: string | symbol) => {
    function getter(this: { getAttribute(name: string): string }) {
      return this.getAttribute(key as string);
    }

    function setter(this: { setAttribute(name: string, value: number | string): void }, value: number | string) {
      this.setAttribute(key as string, value);
    }

    Object.defineProperty(target, key, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
