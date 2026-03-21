import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineSyncObject, defineSyncVariable, defineSyncAttribute } from './decorator-core';
import { ObjectFactory } from './object-factory';
import { GameObject } from './game-object';
import { ObjectStore } from './object-store';
import { ObjectNode } from './object-node';

describe('decorator-core', () => {
  let store: ObjectStore;

  beforeEach(() => {
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  describe('defineSyncObject', () => {
    it('ObjectFactoryにクラスを登録する', () => {
      class TestSyncObj extends GameObject {
        get aliasName() {
          return 'TestSyncObj';
        }
      }
      defineSyncObject('TestSyncObj')(TestSyncObj);
      const factory = ObjectFactory.instance;
      const obj = factory.create('TestSyncObj');
      expect(obj).toBeInstanceOf(TestSyncObj);
    });
  });

  describe('defineSyncVariable', () => {
    it('syncDataを通じたgetter/setterが定義される', () => {
      const obj = new GameObject();
      obj.initialize();

      // defineSyncVariableはプロトタイプにgetter/setterを定義する
      const descriptor = defineSyncVariable();
      descriptor(obj, 'testProp');

      // getter/setterがcontext.syncDataを使う
      (obj as any).testProp = 'hello';
      expect((obj as any).context.syncData['testProp']).toBe('hello');
      expect((obj as any).testProp).toBe('hello');
    });
  });

  describe('defineSyncAttribute', () => {
    it('getAttribute/setAttributeを通じたgetter/setterが定義される', () => {
      const obj = new ObjectNode();
      obj.initialize();

      const descriptor = defineSyncAttribute();
      descriptor(obj, 'testAttr');

      (obj as any).testAttr = 'world';
      expect(obj.getAttribute('testAttr')).toBe('world');
    });
  });
});
