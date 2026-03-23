import { TestBed } from '@angular/core/testing';
import { EventSystem } from '@axe/class/core/system';

import { GameObject } from './game-object';
import { ObjectStore } from './object-store';

describe('ObjectStore', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    // Clear any existing objects from previous tests
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    // Cleanup after each test
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    // Cancel any pending garbageCollectionInterval to prevent leaking timers
    // @ts-expect-error accessing private
    if (store.garbageCollectionInterval != null) {
      // @ts-expect-error accessing private
      clearTimeout(store.garbageCollectionInterval);
      // @ts-expect-error accessing private
      store.garbageCollectionInterval = null;
    }
    vi.clearAllMocks();
  });

  it('should create singleton instance', () => {
    expect(store).toBeTruthy();
    expect(ObjectStore.instance).toBe(store);
  });

  describe('add()', () => {
    it('should add a new object to the store', () => {
      const obj = new GameObject('test-id-1');
      const result = store.add(obj, false);

      expect(result).toBe(obj);
      expect(store.get('test-id-1')).toBe(obj);
    });

    it('should call onStoreAdded lifecycle method', () => {
      const obj = new GameObject('test-id-2');
      vi.spyOn(obj, 'onStoreAdded');

      store.add(obj, false);

      expect(obj.onStoreAdded).toHaveBeenCalled();
    });

    it('should not add duplicate objects', () => {
      const obj = new GameObject('test-id-3');
      store.add(obj, false);

      const result = store.add(obj, false);

      expect(result).toBeNull();
    });

    it('should not add already deleted objects', () => {
      const obj = new GameObject('test-id-4');
      store.add(obj, false);
      store.delete(obj, false);

      const newObj = new GameObject('test-id-4');
      const result = store.add(newObj, false);

      expect(result).toBeNull();
    });

    it('should broadcast update when shouldBroadcast is true', () => {
      vi.spyOn(store, 'update');
      const obj = new GameObject('test-id-5');

      store.add(obj, true);

      expect(store.update).toHaveBeenCalled();
    });

    it('should not broadcast update when shouldBroadcast is false', () => {
      vi.spyOn(store, 'update');
      const obj = new GameObject('test-id-6');

      store.add(obj, false);

      expect(store.update).not.toHaveBeenCalled();
    });
  });

  describe('get()', () => {
    it('should retrieve an object by identifier', () => {
      const obj = new GameObject('test-id-7');
      store.add(obj, false);

      const retrieved = store.get('test-id-7');

      expect(retrieved).toBe(obj);
    });

    it('should return null for non-existent identifier', () => {
      const retrieved = store.get('non-existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('getObjects()', () => {
    it('should return all objects when called without arguments', () => {
      const obj1 = new GameObject('test-id-8');
      const obj2 = new GameObject('test-id-9');
      store.add(obj1, false);
      store.add(obj2, false);

      const objects = store.getObjects();

      expect(objects.length).toBe(2);
      expect(objects).toContain(obj1);
      expect(objects).toContain(obj2);
    });

    it('should return objects filtered by aliasName', () => {
      const obj1 = new GameObject('test-id-10');
      const obj2 = new GameObject('test-id-11');
      store.add(obj1, false);
      store.add(obj2, false);

      const objects = store.getObjects(GameObject.aliasName);

      expect(objects.length).toBe(2);
      expect(objects).toContain(obj1);
      expect(objects).toContain(obj2);
    });

    it('should return empty array for non-existent aliasName', () => {
      const objects = store.getObjects('NonExistentAlias');

      expect(objects).toEqual([]);
    });

    it('should return objects filtered by constructor', () => {
      const obj1 = new GameObject('test-id-12');
      const obj2 = new GameObject('test-id-13');
      store.add(obj1, false);
      store.add(obj2, false);

      const objects = store.getObjects(GameObject);

      expect(objects.length).toBe(2);
      expect(objects).toContain(obj1);
      expect(objects).toContain(obj2);
    });
  });

  describe('remove()', () => {
    it('should remove an object from the store', () => {
      const obj = new GameObject('test-id-14');
      store.add(obj, false);

      const result = store.remove(obj);

      expect(result).toBe(obj);
      expect(store.get('test-id-14')).toBeNull();
    });

    it('should call onStoreRemoved lifecycle method', () => {
      const obj = new GameObject('test-id-15');
      store.add(obj, false);
      vi.spyOn(obj, 'onStoreRemoved');

      store.remove(obj);

      expect(obj.onStoreRemoved).toHaveBeenCalled();
    });

    it('should return null for non-existent object', () => {
      const obj = new GameObject('test-id-16');

      const result = store.remove(obj);

      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should delete an object by reference', () => {
      const obj = new GameObject('test-id-17');
      store.add(obj, false);

      const result = store.delete(obj, false);

      expect(result).toBe(obj);
      expect(store.get('test-id-17')).toBeNull();
    });

    it('should delete an object by identifier', () => {
      const obj = new GameObject('test-id-18');
      store.add(obj, false);

      const result = store.delete('test-id-18', false);

      expect(result).toBe(obj);
      expect(store.get('test-id-18')).toBeNull();
    });

    it('should mark identifier as deleted', () => {
      const obj = new GameObject('test-id-19');
      store.add(obj, false);

      store.delete(obj, false);

      expect(store.isDeleted('test-id-19')).toBe(true);
    });

    it('should broadcast DELETE_GAME_OBJECT event when shouldBroadcast is true', () => {
      vi.spyOn(EventSystem, 'call');
      const obj = new GameObject('test-id-20');
      store.add(obj, false);

      store.delete(obj, true);

      expect(EventSystem.call).toHaveBeenCalledWith('DELETE_GAME_OBJECT', {
        aliasName: obj.aliasName,
        identifier: obj.identifier,
      });
    });

    it('should not broadcast event when shouldBroadcast is false', () => {
      vi.spyOn(EventSystem, 'call');
      const obj = new GameObject('test-id-21');
      store.add(obj, false);

      store.delete(obj, false);

      expect(EventSystem.call).not.toHaveBeenCalled();
    });

    it('should return null when deleting non-existent object by identifier', () => {
      const result = store.delete('non-existent', false);

      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    it('should queue update by identifier', () => {
      vi.spyOn(EventSystem, 'call');
      const obj = new GameObject('test-id-22');
      store.add(obj, false);

      store.update('test-id-22');

      expect(EventSystem.call).toHaveBeenCalledWith('UPDATE_GAME_OBJECT', expect.any(Object));
    });

    it('should queue update by context', () => {
      vi.spyOn(EventSystem, 'call');
      const obj = new GameObject('test-id-23');
      store.add(obj, false);
      const context = obj.toContext();

      store.update(context);

      expect(EventSystem.call).toHaveBeenCalledWith('UPDATE_GAME_OBJECT', context);
    });

    it('should merge multiple updates for the same object', () => {
      vi.spyOn(EventSystem, 'call');
      const obj = new GameObject('test-id-24');
      store.add(obj, false);
      const context1 = obj.toContext();
      context1.majorVersion = 1;
      const context2 = obj.toContext();
      context2.majorVersion = 2;

      store.update(context1);
      store.update(context2);

      // Should be called only once initially, then queued updates are merged
      expect(EventSystem.call).toHaveBeenCalledTimes(1);
    });

    it('should do nothing for non-existent object identifier', () => {
      vi.spyOn(EventSystem, 'call');

      store.update('non-existent');

      expect(EventSystem.call).not.toHaveBeenCalled();
    });
  });

  describe('isDeleted()', () => {
    it('should return true for deleted identifiers', () => {
      const obj = new GameObject('test-id-25');
      store.add(obj, false);
      store.delete(obj, false);

      expect(store.isDeleted('test-id-25')).toBe(true);
    });

    it('should return false for non-deleted identifiers', () => {
      expect(store.isDeleted('never-existed')).toBe(false);
    });

    it('should return false for active objects', () => {
      const obj = new GameObject('test-id-26');
      store.add(obj, false);

      expect(store.isDeleted('test-id-26')).toBe(false);
    });
  });

  describe('getCatalog()', () => {
    it('should return catalog of all objects', () => {
      const obj1 = new GameObject('test-id-27');
      const obj2 = new GameObject('test-id-28');
      store.add(obj1, false);
      store.add(obj2, false);

      const catalog = store.getCatalog();

      expect(catalog.length).toBe(2);
      const identifiers = catalog.map((item) => item.identifier);
      expect(identifiers).toContain('test-id-27');
      expect(identifiers).toContain('test-id-28');
    });

    it('should include version information', () => {
      const obj = new GameObject('test-id-29');
      store.add(obj, false);

      const catalog = store.getCatalog();

      expect(catalog[0]).toEqual({
        identifier: 'test-id-29',
        version: obj.version,
      });
    });

    it('should return empty array when no objects exist', () => {
      const catalog = store.getCatalog();

      expect(catalog).toEqual([]);
    });
  });

  describe('clearDeleteHistory()', () => {
    it('should clear delete history', () => {
      const obj = new GameObject('test-id-30');
      store.add(obj, false);
      store.delete(obj, false);

      expect(store.isDeleted('test-id-30')).toBe(true);

      store.clearDeleteHistory();

      expect(store.isDeleted('test-id-30')).toBe(false);
    });

    it('should allow adding previously deleted object after clearing history', () => {
      const obj1 = new GameObject('test-id-31');
      store.add(obj1, false);
      store.delete(obj1, false);
      store.clearDeleteHistory();

      const obj2 = new GameObject('test-id-31');
      const result = store.add(obj2, false);

      expect(result).toBe(obj2);
      expect(store.get('test-id-31')).toBe(obj2);
    });
  });

  describe('_garbageCollection()', () => {
    it('should evict old entries from garbageMap when size exceeds 100000', () => {
      vi.useFakeTimers();
      try {
        // Directly populate the garbageMap beyond 100000 entries
        // @ts-expect-error accessing private
        const garbageMap: Map<string, number> = store.garbageMap;
        const oldTimestamp = performance.now() - 11 * 60 * 1000; // 11 minutes ago
        for (let i = 0; i < 100002; i++) {
          garbageMap.set(`gc-test-${i}`, oldTimestamp);
        }

        expect(garbageMap.size).toBe(100002);

        // Trigger GC by adding and deleting one more object
        const triggerObj = new GameObject('gc-trigger');
        store.add(triggerObj, false);
        store.delete(triggerObj, false);

        // Advance timer to fire the garbageCollection setTimeout(1000)
        vi.advanceTimersByTime(1100);

        // Old entries should be evicted (size should be back to 100000 or fewer)
        expect(garbageMap.size).toBeLessThanOrEqual(100001);
      } finally {
        vi.useRealTimers();
      }
    });

    it('should not evict entries when garbageMap size is below 100000', () => {
      // Add and delete a small number of objects
      const obj = new GameObject('gc-small-test');
      store.add(obj, false);
      store.delete(obj, false);

      // Entry should remain in garbage map
      expect(store.isDeleted('gc-small-test')).toBe(true);
    });
  });
});
