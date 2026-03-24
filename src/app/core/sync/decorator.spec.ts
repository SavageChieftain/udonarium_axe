import { SyncObject, SyncVar } from './decorator';
import { GameObject } from './game-object';
import { ObjectFactory } from './object-factory';
import { ObjectNode } from './object-node';
import { ObjectStore } from './object-store';

describe('decorator', () => {
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

  describe('SyncObject', () => {
    it('クラスをObjectFactoryに登録する', () => {
      @SyncObject('DecoratorTestObj')
      class DecoratorTestObj extends GameObject {}
      const obj = ObjectFactory.instance.create('DecoratorTestObj');
      expect(obj).toBeInstanceOf(DecoratorTestObj);
    });
  });

  describe('SyncVar on GameObject', () => {
    it('GameObjectの場合syncDataを使うgetter/setterになる', () => {
      const obj = new GameObject();
      obj.initialize();

      // SyncVarをGameObjectインスタンスに適用
      SyncVar()(obj, 'testField');
      (obj as unknown as Record<string, unknown>).testField = 42;
      expect((obj as unknown as { context: { syncData: Record<string, unknown> } }).context.syncData['testField']).toBe(
        42
      );
    });
  });

  describe('SyncVar on ObjectNode', () => {
    it('ObjectNodeの場合attributeを使うgetter/setterになる', () => {
      const node = new ObjectNode();
      node.initialize();

      SyncVar()(node, 'testNodeField');
      (node as unknown as Record<string, unknown>).testNodeField = 'value';
      expect(node.getAttribute('testNodeField')).toBe('value');
    });
  });
});
