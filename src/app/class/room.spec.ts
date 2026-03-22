import { TestBed } from '@angular/core/testing';

import { ObjectStore } from './core/synchronize-object/object-store';
import { Room } from './room';

describe('Room', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  describe('インスタンス生成', () => {
    it('Roomを作成できる', () => {
      const room = new Room();
      room.initialize();
      expect(room).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('ObjectStoreから自身を削除する', () => {
      const room = new Room();
      room.initialize();
      expect(store.get(room.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('空の状態では空文字列を返す', () => {
      const room = new Room();
      room.initialize();
      expect(room.innerXml()).toBe('');
    });
  });
});
