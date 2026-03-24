import { EventSystem } from '@axe/core/event/event-system';

import { markForChanged, markForChildrenChanged } from './object-event-extension';
import { ObjectNode } from './object-node';
import { ObjectStore } from './object-store';

describe('object-event-extension', () => {
  let store: ObjectStore;
  let key: object;

  beforeEach(() => {
    store = ObjectStore.instance;
    key = {};
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    EventSystem.instance.unregister(key);
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  describe('markForChanged', () => {
    it('オブジェクト変更イベントをバッチ発火する', async () => {
      const obj = new ObjectNode();
      obj.initialize();

      const callback = vi.fn();
      EventSystem.instance.register(key).on(`UPDATE_GAME_OBJECT/identifier/${obj.identifier}`, callback);

      markForChanged(obj);

      // queueMicrotaskで非同期実行されるので少し待つ
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('markForChildrenChanged', () => {
    it('親ノードに対して子変更イベントをバッチ発火する', async () => {
      const parent = new ObjectNode();
      parent.initialize();
      const child = new ObjectNode();
      child.initialize();
      parent.appendChild(child);

      const callback = vi.fn();
      EventSystem.instance.register(key).on(`UPDATE_OBJECT_CHILDREN/identifier/${parent.identifier}`, callback);

      markForChildrenChanged(parent);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });
  });
});
