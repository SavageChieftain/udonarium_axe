import { defineSyncAttribute, defineSyncObject, defineSyncVariable } from '@axe/core/sync/decorator-core';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectFactory } from '@axe/core/sync/object-factory';
import { ObjectNode } from '@axe/core/sync/object-node';

describe('decorator-core', () => {
  beforeEach(() => {});

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('defineSyncObject', () => {
    it('registers the class with the object factory', () => {
      class TestSyncObj extends GameObject {
        override get aliasName() {
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
    it('defines an accessor over the sync data', () => {
      const obj = new GameObject();
      obj.initialize();

      // defines the accessor on the prototype
      const descriptor = defineSyncVariable();
      descriptor(obj, 'testProp');

      // the accessor reads and writes the sync data
      (obj as unknown as Record<string, unknown>).testProp = 'hello';
      expect((obj as unknown as { context: { syncData: Record<string, unknown> } }).context.syncData['testProp']).toBe(
        'hello'
      );
      expect((obj as unknown as Record<string, unknown>).testProp).toBe('hello');
    });
  });

  describe('defineSyncAttribute', () => {
    it('defines an accessor over the attributes', () => {
      const obj = new ObjectNode();
      obj.initialize();

      const descriptor = defineSyncAttribute();
      descriptor(obj, 'testAttr');

      (obj as unknown as Record<string, unknown>).testAttr = 'world';
      expect(obj.getAttribute('testAttr')).toBe('world');
    });
  });
});
