import { Logger } from '@axe/class/core/logger';

import { GameObject } from './game-object';

export interface Type<T> {
  new (...args: never[]): T;
  aliasName?: string;
}

export class ObjectFactory {
  private static _instance: ObjectFactory;
  static get instance(): ObjectFactory {
    if (!ObjectFactory._instance) ObjectFactory._instance = new ObjectFactory();
    return ObjectFactory._instance;
  }

  private constructorMap: Map<string, Type<GameObject>> = new Map();
  private aliasMap: Map<Type<GameObject>, string> = new Map();

  private constructor() {}

  register<T extends GameObject>(constructor: Type<T>, alias?: string) {
    if (!alias) alias = constructor.name ?? constructor.toString().match(/function\s*([^(]*)\(/)?.[1] ?? '';
    if (this.constructorMap.has(alias)) {
      Logger.error(`[ObjectFactory] alias が重複しています: ${alias}`);
      return;
    }
    if (this.aliasMap.has(constructor)) {
      Logger.error('[ObjectFactory] constructor が重複しています', constructor);
      return;
    }
    this.constructorMap.set(alias, constructor);
    this.aliasMap.set(constructor, alias);
  }

  create<T extends GameObject>(alias: string, identifer?: string): T | null {
    const classConstructor = this.constructorMap.get(alias);
    if (!classConstructor) {
      Logger.error(`${alias}という名のGameObjectクラスは定義されていません`);
      return null;
    }
    const gameObject: GameObject = new (classConstructor as unknown as new (identifier?: string) => GameObject)(
      identifer
    );
    return gameObject as T;
  }

  getAlias<T extends GameObject>(constructor: Type<T>): string {
    return this.aliasMap.get(constructor) ?? '';
  }
}
