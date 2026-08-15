import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { ImageTag } from '@axe/domain/media/image-tag';

describe('ImageTag', () => {
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
    it('is created against an image identifier', () => {
      const tag = ImageTag.create('img001');
      expect(tag).toBeTruthy();
      expect(tag.imageIdentifier).toBe('img001');
    });

    it('carries the image tag prefix in its identifier', () => {
      const tag = ImageTag.create('img001');
      expect(tag.identifier).toBe('imagetag_img001');
    });

    it('is added to the store', () => {
      const tag = ImageTag.create('img001');
      expect(store.get(tag.identifier)).toBe(tag);
    });
  });

  describe('get()', () => {
    it('looks a tag up by its image identifier', () => {
      ImageTag.create('img001');
      const found = ImageTag.get('img001');
      expect(found).toBeTruthy();
      expect(found.imageIdentifier).toBe('img001');
    });

    it('returns nothing for an identifier that is not there', () => {
      expect(ImageTag.get('nonexistent')).toBeFalsy();
    });
  });

  describe('SyncVar', () => {
    it('starts untagged', () => {
      const tag = ImageTag.create('img001');
      expect(tag.tag).toBe('');
    });

    it('takes a tag', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'モンスター 森';
      expect(tag.tag).toBe('モンスター 森');
    });
  });

  describe('containsWords()', () => {
    it('is true when every word is there', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'モンスター 森 ボス';
      expect(tag.containsWords(['モンスター', '森'])).toBe(true);
    });

    it('is false when one is missing', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'モンスター 森';
      expect(tag.containsWords(['モンスター', '海'])).toBe(false);
    });

    it('is true for no words at all', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'anything';
      expect(tag.containsWords([])).toBe(true);
    });
  });
});
