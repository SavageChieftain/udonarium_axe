import {
  childrenChanged$,
  markForChanged,
  markForChildrenChanged,
  objectAdded$,
  objectChanged$,
  objectRemoved$,
} from './object-event-extension';
import { ObjectNode } from './object-node';
import { ObjectStore } from './object-store';

describe('object-event-extension', () => {
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

  describe('markForChanged', () => {
    it('objectChanged$ にバッチ発火する', async () => {
      const obj = new ObjectNode();
      obj.initialize();

      const callback = vi.fn();
      const sub = objectChanged$.subscribe(callback);

      markForChanged(obj);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toEqual(expect.objectContaining({ identifier: obj.identifier }));
      sub.unsubscribe();
    });
  });

  describe('markForChildrenChanged', () => {
    it('childrenChanged$ にバッチ発火する', async () => {
      const parent = new ObjectNode();
      parent.initialize();
      const child = new ObjectNode();
      child.initialize();
      parent.appendChild(child);

      const callback = vi.fn();
      const sub = childrenChanged$.subscribe(callback);

      markForChildrenChanged(parent);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
      expect(callback.mock.calls[0][0]).toEqual(expect.objectContaining({ identifier: parent.identifier }));
      sub.unsubscribe();
    });
  });

  describe('objectAdded$', () => {
    it('Subject として公開されている', () => {
      expect(objectAdded$).toBeTruthy();
      expect(typeof objectAdded$.subscribe).toBe('function');
    });
  });

  describe('objectRemoved$', () => {
    it('Subject として公開されている', () => {
      expect(objectRemoved$).toBeTruthy();
      expect(typeof objectRemoved$.subscribe).toBe('function');
    });
  });
});
