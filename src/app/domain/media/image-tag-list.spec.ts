import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';

import { ImageTagList } from './image-tag-list';

describe('ImageTagList', () => {
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

  describe('create()', () => {
    it('ImageFile配列からImageTagListを作成する', () => {
      const list = ImageTagList.create([]);
      expect(list).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('ObjectStoreから自身を削除する', () => {
      const list = new ImageTagList();
      list.initialize();
      // onStoreAddedでObjectStoreから削除されるため見つからない
      expect(store.get(list.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('空のリストでは空文字列を返す', () => {
      const list = ImageTagList.create([]);
      expect(list.innerXml()).toBe('');
    });
  });
});
