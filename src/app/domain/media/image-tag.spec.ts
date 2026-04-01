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
    it('imageIdentifierを指定して作成する', () => {
      const tag = ImageTag.create('img001');
      expect(tag).toBeTruthy();
      expect(tag.imageIdentifier).toBe('img001');
    });

    it('identifierが"imagetag_"接頭辞を持つ', () => {
      const tag = ImageTag.create('img001');
      expect(tag.identifier).toBe('imagetag_img001');
    });

    it('ObjectStoreに追加される', () => {
      const tag = ImageTag.create('img001');
      expect(store.get(tag.identifier)).toBe(tag);
    });
  });

  describe('get()', () => {
    it('imageIdentifierでImageTagを取得する', () => {
      ImageTag.create('img001');
      const found = ImageTag.get('img001');
      expect(found).toBeTruthy();
      expect(found.imageIdentifier).toBe('img001');
    });

    it('存在しないIDの場合nullを返す', () => {
      expect(ImageTag.get('nonexistent')).toBeFalsy();
    });
  });

  describe('SyncVar', () => {
    it('tag がデフォルト空文字', () => {
      const tag = ImageTag.create('img001');
      expect(tag.tag).toBe('');
    });

    it('tagを設定できる', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'モンスター 森';
      expect(tag.tag).toBe('モンスター 森');
    });
  });

  describe('containsWords()', () => {
    it('全てのワードを含む場合trueを返す', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'モンスター 森 ボス';
      expect(tag.containsWords(['モンスター', '森'])).toBe(true);
    });

    it('一部のワードが含まれない場合falseを返す', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'モンスター 森';
      expect(tag.containsWords(['モンスター', '海'])).toBe(false);
    });

    it('空配列の場合trueを返す', () => {
      const tag = ImageTag.create('img001');
      tag.tag = 'anything';
      expect(tag.containsWords([])).toBe(true);
    });
  });
});
