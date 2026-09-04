import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTagList } from '@axe/domain/media/audio-tag-list';

describe('AudioTagList', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  describe('create()', () => {
    it('builds the tag list from the audio files', () => {
      const list = AudioTagList.create([]);
      expect(list).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('takes itself out of the store', () => {
      const list = new AudioTagList();
      list.initialize();
      expect(store.get(list.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('returns nothing for an empty list', () => {
      const list = AudioTagList.create([]);
      expect(list.innerXml()).toBe('');
    });
  });
});
