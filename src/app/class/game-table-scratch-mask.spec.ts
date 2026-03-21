import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GameTableScratchMask } from './game-table-scratch-mask';
import { ObjectStore } from './core/synchronize-object/object-store';

describe('GameTableScratchMask', () => {
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
      const mask = GameTableScratchMask.create('スクラッチ', 3, 4, 100);
      expect(mask).toBeTruthy();
      expect(mask.name).toBe('スクラッチ');
      expect(mask.width).toBe(3);
      expect(mask.height).toBe(4);
    });

    it('カスタムidentifierで作成する', () => {
      const mask = GameTableScratchMask.create('mask', 1, 1, 100, 'scratch-id');
      expect(mask.identifier).toBe('scratch-id');
    });

    it('ObjectStoreに追加される', () => {
      const mask = GameTableScratchMask.create('mask', 1, 1, 100);
      expect(store.get(mask.identifier)).toBe(mask);
    });

    it('Mが2500要素で初期化される', () => {
      const mask = GameTableScratchMask.create('mask', 1, 1, 100);
      expect(mask.M).toHaveLength(2500);
    });
  });

  describe('aliasName', () => {
    it('"table-scratch-mask"を返す', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.aliasName).toBe('table-scratch-mask');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLock がデフォルト false', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.isLock).toBe(false);
    });

    it('isScratch がデフォルト false', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.isScratch).toBe(false);
    });

    it('color がデフォルト "#404040"', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.color).toBe('#404040');
    });

    it('changeColor がデフォルト "#FF5050"', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.changeColor).toBe('#FF5050');
    });

    it('owner がデフォルト空文字', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.owner).toBe('');
    });
  });

  describe('getMaxSize()', () => {
    it('50を返す', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.getMaxSize()).toBe(50);
    });
  });

  describe('getMapXY / setMapXY', () => {
    it('fillMapBack未確保の場合setMapXYは何もしない', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      // fillMapBack is empty, guard condition prevents write
      mask.setMapXY(0, 0, false);
      // M is still untouched
      expect(mask.getMapXY(0, 0, false)).toBeTruthy();
    });

    it('初期値がtruthy(Mはfill(1))', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.getMapXY(0, 0, false)).toBeTruthy();
    });

    it('copyMain2BackMap後にsetMapXYでfillMapBackを更新できる', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      mask.setMapXY(0, 0, false);
      expect(mask.getMapXY(0, 0, true)).toBe(false);
    });

    it('myScratch=trueでfillMapBackから読み取る', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      expect(mask.getMapXY(0, 0, true)).toBeTruthy();
    });
  });

  describe('copyMain2BackMap / copyBack2MainMap', () => {
    it('メイン→バックのコピーが正しく動作する', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      // fillMapBackにMの内容がコピーされる
      expect(mask.getMapXY(5, 5, true)).toBeTruthy();
    });

    it('バック→メインのコピーが正しく動作する', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      // fillMapBackを変更
      mask.setMapXY(5, 5, false);
      expect(mask.getMapXY(5, 5, true)).toBe(false);

      // メインにコピー
      mask.copyBack2MainMap();
      expect(mask.getMapXY(5, 5, false)).toBeFalsy();
    });

    it('reverseMapXYで値を反転してコピーできる', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      // 初期値はtruthy(1)
      mask.reverseMapXY(5, 5);
      expect(mask.getMapXY(5, 5, true)).toBeFalsy();

      mask.copyBack2MainMap();
      expect(mask.getMapXY(5, 5, false)).toBeFalsy();
    });
  });

  describe('hasOwner', () => {
    it('ownerが空文字ならfalse', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.hasOwner).toBe(false);
    });

    it('ownerがセットされていればtrue', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.owner = 'user-1';
      expect(mask.hasOwner).toBe(true);
    });
  });

  describe('TabletopObject 継承', () => {
    it('locationのデフォルトがtable', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.location.name).toBe('table');
    });
  });
});
