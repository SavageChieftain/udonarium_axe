import { defineSyncAttribute, defineSyncObject, defineSyncVariable } from '@axe/core/sync/decorator-core';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectNode } from '@axe/core/sync/object-node';
import { ObjectStore } from '@axe/core/sync/object-store';

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
      (obj as unknown as Record<string, unknown>).testProp = 'hello';
      expect((obj as unknown as { context: { syncData: Record<string, unknown> } }).context.syncData['testProp']).toBe(
        'hello'
      );
      expect((obj as unknown as Record<string, unknown>).testProp).toBe('hello');
    });
  });

  describe('defineSyncAttribute', () => {
    it('getAttribute/setAttributeを通じたgetter/setterが定義される', () => {
      const obj = new ObjectNode();
      obj.initialize();

      const descriptor = defineSyncAttribute();
      descriptor(obj, 'testAttr');

      (obj as unknown as Record<string, unknown>).testAttr = 'world';
      expect(obj.getAttribute('testAttr')).toBe('world');
    });
  });
});
