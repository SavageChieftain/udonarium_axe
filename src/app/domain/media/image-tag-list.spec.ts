import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ImageTagList } from '@axe/domain/media/image-tag-list';

describe('ImageTagList', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  describe('create()', () => {
    it('builds the tag list from the image files', () => {
      const list = ImageTagList.create([]);
      expect(list).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('takes itself out of the store', () => {
      const list = new ImageTagList();
      list.initialize();
      // it is taken out of the store as it is added, so it cannot be found
      expect(store.get(list.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('returns nothing for an empty list', () => {
      const list = ImageTagList.create([]);
      expect(list.innerXml()).toBe('');
    });
  });
});
