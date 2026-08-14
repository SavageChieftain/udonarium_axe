import { TestBed } from '@angular/core/testing';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { RangeArea } from '@axe/domain/tabletop/range';

describe('RangeArea', () => {
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
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('名前とサイズを指定して作成する', () => {
      const range = RangeArea.create('射程範囲', 3, 5, 80);
      expect(range).toBeTruthy();
      expect(range.name).toBe('射程範囲');
      expect(range.width).toBe(3);
      expect(range.length).toBe(5);
    });

    it('カスタムidentifierで作成する', () => {
      const range = RangeArea.create('range', 1, 1, 50, 'range-id');
      expect(range.identifier).toBe('range-id');
    });

    it('ObjectStoreに追加される', () => {
      const range = RangeArea.create('range', 1, 1, 50);
      expect(store.get(range.identifier)).toBe(range);
    });
  });

  describe('aliasName', () => {
    it('"range"を返す', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.aliasName).toBe('range');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLock がデフォルト false', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.isLock).toBe(false);
    });

    it('rotate がデフォルト 0', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.rotate).toBe(0);
    });

    it('type がデフォルト "CORN"', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.type).toBe('CORN');
    });

    it('DIAMOND を設定すると SQUARE + 45度回転にフォールバックする', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      range.rotate = 10;

      range.type = 'DIAMOND';

      expect(range.type).toBe('SQUARE');
      expect(range.rotate).toBe(55);
    });

    it('gridColor がデフォルト "#FFFF00"', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.gridColor).toBe('#FFFF00');
    });

    it('rangeColor がデフォルト "#000000"', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.rangeColor).toBe('#000000');
    });

    it('fillOutLine がデフォルト false', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.fillOutLine).toBe(false);
    });

    it('offSetX がデフォルト false', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.offSetX).toBe(false);
    });

    it('offSetY がデフォルト false', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.offSetY).toBe(false);
    });
  });

  describe('isAltitudeIndicate', () => {
    it('コンストラクタでtrueに設定される', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.isAltitudeIndicate).toBe(true);
    });
  });

  describe('TabletopObject 継承', () => {
    it('locationのデフォルトがtable', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.location.name).toBe('table');
    });
  });

  describe('旧セーブデータ互換', () => {
    it('type=DIAMOND のXMLは SQUARE + 45度回転として読み込む', () => {
      const range = ObjectSerializer.instance.parseXml('<range type="DIAMOND" rotate="0"></range>') as RangeArea;

      expect(range.type).toBe('SQUARE');
      expect(range.rotate).toBe(45);
    });

    it('cellPattern と customGridType がデフォルト空文字', () => {
      const range = RangeArea.create('test', 1, 1, 50);
      expect(range.cellPattern).toBe('');
      expect(range.customGridType).toBe('');
    });
  });

  describe('createCustom()', () => {
    it('CUSTOM 型でセルパターンとグリッド種別を保存', () => {
      const range = RangeArea.createCustom('カスタム', '0,0;1,0;0,1', 'square', 100);
      expect(range.type).toBe('CUSTOM');
      expect(range.cellPattern).toBe('0,0;1,0;0,1');
      expect(range.customGridType).toBe('square');
    });

    it('セルの bounding box から width/length を算出', () => {
      const range = RangeArea.createCustom('L字', '0,0;1,0;2,0;0,1;0,2', 'square', 100);
      expect(range.width).toBe(3);
      expect(range.length).toBe(3);
    });

    it('空セルでも最低 1x1', () => {
      const range = RangeArea.createCustom('空', '', 'square', 100);
      expect(range.width).toBe(1);
      expect(range.length).toBe(1);
      expect(range.cellPattern).toBe('');
    });

    it('isRotatable オプションが反映される', () => {
      const rotatable = RangeArea.createCustom('回転可', '0,0', 'square', 100, { isRotatable: true });
      const fixed = RangeArea.createCustom('回転不可', '0,0', 'square', 100);
      expect(rotatable.isRotatable).toBe(true);
      expect(fixed.isRotatable).toBe(false);
    });
  });
});

describe('付き従う相手の保存名', () => {
  it('書き出す名前は綴りを誤ったまま据え置くこと', () => {
    // 出回っている部屋データと同卓者が使っている名前。手元の綴りを直すために変えると、
    // 古いデータからは相手を見失い、同卓者とも噛み合わなくなる。
    const range = RangeArea.create('範囲', 3, 5, 1);
    range.followingCharacterIdentifier = 'char-1';

    expect(range.toXml()).toContain('followingCharctorIdentifier="char-1"');
  });

  it('その名前で書かれた部屋データから読めること', () => {
    const restored = ObjectSerializer.instance.parseXml(
      '<range name="範囲" followingCharctorIdentifier="char-1"></range>'
    ) as RangeArea;

    expect(restored.followingCharacterIdentifier).toBe('char-1');
  });
});
