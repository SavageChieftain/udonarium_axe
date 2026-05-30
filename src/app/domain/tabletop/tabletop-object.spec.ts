import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { surfaceOf, TabletopObject } from '@axe/domain/tabletop/tabletop-object';

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

    it('surfaceOf は location.surface が未設定なら floor を返す', () => {
      const obj = new TabletopObject();
      obj.initialize();
      expect(surfaceOf(obj)).toBe('floor');
    });

    it('surfaceOf は location.surface が設定されていればその値を返す', () => {
      const obj = new TabletopObject();
      obj.initialize();
      obj.location.surface = 'north-wall';
      expect(surfaceOf(obj)).toBe('north-wall');
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

  describe('altitude', () => {
    function createTabletopObjectWithCommon(): TabletopObject {
      const obj = new TabletopObject();
      const root = DataElement.create('TabletopObject', '', {}, `TabletopObject_${obj.identifier}`);
      const common = DataElement.create('common', '', {}, `common_${obj.identifier}`);
      obj.initialize();
      obj.appendChild(root);
      root.appendChild(common);
      return obj;
    }

    it('altitude 要素が無いとき getter は副作用なく 0 を返す', () => {
      const obj = createTabletopObjectWithCommon();
      const before = obj.commonDataElement!.children.length;
      expect(obj.altitude).toBe(0);
      expect(obj.commonDataElement!.children.length).toBe(before);
    });

    it('getter を多数回呼んでも altitude 要素が増殖しない', () => {
      const obj = createTabletopObjectWithCommon();
      for (let i = 0; i < 10; i++) void obj.altitude;
      const altitudes = obj.commonDataElement!.getElementsByName('altitude');
      expect(altitudes.length).toBe(0);
    });

    it('setter は altitude 要素が無いとき遅延生成する', () => {
      const obj = createTabletopObjectWithCommon();
      obj.altitude = 5;
      const altitudes = obj.commonDataElement!.getElementsByName('altitude');
      expect(altitudes.length).toBe(1);
      expect(obj.altitude).toBe(5);
    });

    it('parseInnerXml 後に重複する altitude 要素は最初の 1 つに統合される', () => {
      const obj = createTabletopObjectWithCommon();
      const common = obj.commonDataElement!;
      // 過去バグの再現: 同一 identifier の altitude が _children に複数積まれた状態
      const altitudeId = `altitude_${obj.identifier}`;
      for (let i = 0; i < 3; i++) {
        const dup = new DataElement(altitudeId);
        dup.name = 'altitude';
        dup.value = i;
        dup.initialize();
        common.appendChild(dup);
      }
      expect(common.getElementsByName('altitude').length).toBe(3);

      const dummy = document.createElement('TabletopObject');
      obj.parseInnerXml(dummy);

      expect(common.getElementsByName('altitude').length).toBe(1);
    });

    it('dedup は値の入っている altitude を優先して残す', () => {
      const obj = createTabletopObjectWithCommon();
      const common = obj.commonDataElement!;
      const zeroAltitude = new DataElement(`altitude_${obj.identifier}_a`);
      zeroAltitude.name = 'altitude';
      zeroAltitude.value = 0;
      zeroAltitude.initialize();
      common.appendChild(zeroAltitude);

      const realAltitude = new DataElement(`altitude_${obj.identifier}_b`);
      realAltitude.name = 'altitude';
      realAltitude.value = 7;
      realAltitude.initialize();
      common.appendChild(realAltitude);

      const dummy = document.createElement('TabletopObject');
      obj.parseInnerXml(dummy);

      const survivors = common.getElementsByName('altitude');
      expect(survivors.length).toBe(1);
      expect(+survivors[0].value).toBe(7);
    });
  });

  describe('common 要素の表示順', () => {
    function appendCommonChild(common: DataElement, name: string, value: number | string): DataElement {
      const el = DataElement.create(name, value, {}, `${name}_${common.identifier}`);
      common.appendChild(el);
      return el;
    }

    function createWithCommon(): { obj: TabletopObject; common: DataElement } {
      const obj = new TabletopObject();
      const root = DataElement.create('TabletopObject', '', {}, `TabletopObject_${obj.identifier}`);
      const common = DataElement.create('common', '', {}, `common_${obj.identifier}`);
      obj.initialize();
      obj.appendChild(root);
      root.appendChild(common);
      return { obj, common };
    }

    it('parseInnerXml 後に name > size > width > height > depth > altitude の順に並ぶ', () => {
      const { obj, common } = createWithCommon();
      // わざと逆順で追加
      appendCommonChild(common, 'altitude', 3);
      appendCommonChild(common, 'depth', 2);
      appendCommonChild(common, 'height', 4);
      appendCommonChild(common, 'width', 5);
      appendCommonChild(common, 'size', 1);
      appendCommonChild(common, 'name', 'foo');

      const dummy = document.createElement('TabletopObject');
      obj.parseInnerXml(dummy);

      const names = common.children.map((c) => c.getAttribute('name'));
      expect(names).toEqual(['name', 'size', 'width', 'height', 'depth', 'altitude']);
    });

    it('優先要素以外は元の相対位置を維持する', () => {
      const { obj, common } = createWithCommon();
      // Range 想定: name, length, width — length は優先要素ではない
      appendCommonChild(common, 'width', 2);
      appendCommonChild(common, 'length', 5);
      appendCommonChild(common, 'name', 'r');

      const dummy = document.createElement('TabletopObject');
      obj.parseInnerXml(dummy);

      const names = common.children.map((c) => c.getAttribute('name'));
      // 元の優先要素のスロット(0, 2)に name, width が入り、length(1) は据え置き
      expect(names).toEqual(['name', 'length', 'width']);
    });
  });
});
