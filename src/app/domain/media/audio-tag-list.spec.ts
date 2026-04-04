import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTagList } from '@axe/domain/media/audio-tag-list';

describe('AudioTagList', () => {
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
    it('AudioFile配列からAudioTagListを作成する', () => {
      const list = AudioTagList.create([]);
      expect(list).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('ObjectStoreから自身を削除する', () => {
      const list = new AudioTagList();
      list.initialize();
      expect(store.get(list.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('空のリストでは空文字列を返す', () => {
      const list = AudioTagList.create([]);
      expect(list.innerXml()).toBe('');
    });
  });
});
