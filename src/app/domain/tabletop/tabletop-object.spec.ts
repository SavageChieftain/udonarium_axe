import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';

import { TabletopObject } from './tabletop-object';

describe('TabletopObject', () => {
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
    vi.restoreAllMocks();
  });

  describe('SyncVar デフォルト値', () => {
    it('locationのデフォルト値', () => {
      const obj = new TabletopObject();
      obj.initialize();
      expect(obj.location).toEqual({ name: 'table', x: 0, y: 0 });
    });

    it('posZのデフォルトは0', () => {
      const obj = new TabletopObject();
      obj.initialize();
      expect(obj.posZ).toBe(0);
    });

    it('isAltitudeIndicateのデフォルトはfalse', () => {
      const obj = new TabletopObject();
      obj.initialize();
      expect(obj.isAltitudeIndicate).toBe(false);
    });
  });

  describe('isVisibleOnTable', () => {
    it('location.nameがtableの場合true', () => {
      const obj = new TabletopObject();
      obj.initialize();
      expect(obj.isVisibleOnTable).toBe(true);
    });

    it('location.nameがtable以外の場合false', () => {
      const obj = new TabletopObject();
      obj.initialize();
      obj.location = { name: 'graveyard', x: 0, y: 0 };
      expect(obj.isVisibleOnTable).toBe(false);
    });
  });

  describe('setLocation', () => {
    it('locationのnameを更新する', () => {
      const obj = new TabletopObject();
      obj.initialize();
      obj.setLocation('graveyard');
      expect(obj.location.name).toBe('graveyard');
    });
  });

  describe('rootDataElement', () => {
    it('初期状態ではnullish', () => {
      const obj = new TabletopObject();
      obj.initialize();
      expect(obj.rootDataElement).toBeFalsy();
    });
  });

  describe('createDataElements', () => {
    it('protectedメソッドでデータ構造を初期化する', () => {
      // TabletopObjectはprotectedメソッド createDataElements を持つ
      // サブクラス(GameCharacterなど)経由でテスト可能
      const obj = new TabletopObject();
      obj.initialize();
      // aliasNameが設定されていないとrootDataElementは作成されない
      expect(obj.rootDataElement).toBeFalsy();
    });
  });
});
