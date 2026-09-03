import { SyncObject, SyncVar } from '@axe/core/sync/decorator';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectNode } from '@axe/core/sync/object-node';

describe('decorator', () => {
  beforeEach(() => {});

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SyncObject', () => {
    it('registers the class with the object factory', () => {
      @SyncObject('DecoratorTestObj')
      class DecoratorTestObj extends GameObject {}
      const obj = ObjectFactory.instance.create('DecoratorTestObj');
      expect(obj).toBeInstanceOf(DecoratorTestObj);
    });
  });

  describe('SyncVar on GameObject', () => {
    it('a game object gets an accessor over its sync data', () => {
      const obj = new GameObject();
      obj.initialize();

      // apply the decorator to a game object
      SyncVar()(obj, 'testField');
      (obj as unknown as Record<string, unknown>).testField = 42;
      expect((obj as unknown as { context: { syncData: Record<string, unknown> } }).context.syncData['testField']).toBe(
        42
      );
    });
  });

  describe('SyncVar on ObjectNode', () => {
    it('an object node gets an accessor over its attributes', () => {
      const node = new ObjectNode();
      node.initialize();

      SyncVar()(node, 'testNodeField');
      (node as unknown as Record<string, unknown>).testNodeField = 'value';
      expect(node.getAttribute('testNodeField')).toBe('value');
    });
  });
});
