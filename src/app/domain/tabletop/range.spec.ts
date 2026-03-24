import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';

import { RangeArea } from './range';

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
});
