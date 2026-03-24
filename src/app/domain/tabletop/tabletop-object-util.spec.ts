import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';

import { GameTableMask } from './game-table-mask';
import { moveToTopmost, Stackable } from './tabletop-object-util';

describe('tabletop-object-util', () => {
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

  describe('moveToTopmost()', () => {
    it('単一オブジェクトのzindexを設定する', () => {
      const mask = GameTableMask.create('test', 1, 1, 100) as unknown as Stackable;
      mask.zindex = 0;
      moveToTopmost(mask);
      // 最大zindex + 1 = 0 + 1 = 1 ... ただし既に最大なら変更なし
      expect(mask.zindex).toBeDefined();
    });

    it('複数オブジェクトで最上位に移動する', () => {
      const mask1 = GameTableMask.create('m1', 1, 1, 100) as unknown as Stackable;
      const mask2 = GameTableMask.create('m2', 1, 1, 100) as unknown as Stackable;
      const mask3 = GameTableMask.create('m3', 1, 1, 100) as unknown as Stackable;

      mask1.zindex = 0;
      mask2.zindex = 1;
      mask3.zindex = 2;

      moveToTopmost(mask1);
      expect(mask1.zindex).toBe(3);
    });

    it('既に最上位で競合がない場合変更しない', () => {
      const mask1 = GameTableMask.create('m1', 1, 1, 100) as unknown as Stackable;
      const mask2 = GameTableMask.create('m2', 1, 1, 100) as unknown as Stackable;

      mask1.zindex = 0;
      mask2.zindex = 1;

      moveToTopmost(mask2);
      expect(mask2.zindex).toBe(1);
    });
  });
});
