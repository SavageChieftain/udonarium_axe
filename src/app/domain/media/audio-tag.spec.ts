import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { AudioTag } from '@axe/domain/media/audio-tag';

describe('AudioTag', () => {
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
    it('audioIdentifierを指定して作成する', () => {
      const tag = AudioTag.create('aud001');
      expect(tag).toBeTruthy();
      expect(tag.audioIdentifier).toBe('aud001');
    });

    it('identifierが"audiotag_"接頭辞を持つ', () => {
      const tag = AudioTag.create('aud001');
      expect(tag.identifier).toBe('audiotag_aud001');
    });

    it('ObjectStoreに追加される', () => {
      const tag = AudioTag.create('aud001');
      expect(store.get(tag.identifier)).toBe(tag);
    });
  });

  describe('get()', () => {
    it('audioIdentifierでAudioTagを取得する', () => {
      AudioTag.create('aud001');
      const found = AudioTag.get('aud001');
      expect(found).toBeTruthy();
      expect(found.audioIdentifier).toBe('aud001');
    });

    it('存在しないIDの場合falsyを返す', () => {
      expect(AudioTag.get('nonexistent')).toBeFalsy();
    });
  });

  describe('SyncVar', () => {
    it('tagのデフォルトはBGM', () => {
      const tag = AudioTag.create('aud001');
      expect(tag.tag).toBe('BGM');
    });

    it('tagを設定できる', () => {
      const tag = AudioTag.create('aud001');
      tag.tag = 'SE';
      expect(tag.tag).toBe('SE');
    });
  });

  describe('containsWords()', () => {
    it('全てのワードを含む場合trueを返す', () => {
      const tag = AudioTag.create('aud001');
      tag.tag = 'BGM 戦闘';
      expect(tag.containsWords(['BGM', '戦闘'])).toBe(true);
    });

    it('一部のワードが含まれない場合falseを返す', () => {
      const tag = AudioTag.create('aud001');
      tag.tag = 'BGM 戦闘';
      expect(tag.containsWords(['BGM', '街'])).toBe(false);
    });

    it('空配列の場合trueを返す', () => {
      const tag = AudioTag.create('aud001');
      tag.tag = 'anything';
      expect(tag.containsWords([])).toBe(true);
    });
  });
});
