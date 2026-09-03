import { TestBed } from '@angular/core/testing';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { moveToBottommost, moveToTopmost, Stackable } from '@axe/domain/tabletop/tabletop-object-util';

describe('tabletop-object-util', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('moveToTopmost()', () => {
    it('sets the stacking of one object', () => {
      const mask = GameTableMask.create('test', 1, 1, 100) as unknown as Stackable;
      mask.zindex = 0;
      moveToTopmost(mask);
      // one above the highest, or unchanged when it is already there
      expect(mask.zindex).toBeDefined();
    });

    it('brings one to the top of several', () => {
      const mask1 = GameTableMask.create('m1', 1, 1, 100) as unknown as Stackable;
      const mask2 = GameTableMask.create('m2', 1, 1, 100) as unknown as Stackable;
      const mask3 = GameTableMask.create('m3', 1, 1, 100) as unknown as Stackable;

      mask1.zindex = 0;
      mask2.zindex = 1;
      mask3.zindex = 2;

      moveToTopmost(mask1);
      expect(mask1.zindex).toBe(3);
    });

    it('leaves it alone when it is already on top with nothing above', () => {
      const mask1 = GameTableMask.create('m1', 1, 1, 100) as unknown as Stackable;
      const mask2 = GameTableMask.create('m2', 1, 1, 100) as unknown as Stackable;

      mask1.zindex = 0;
      mask2.zindex = 1;

      moveToTopmost(mask2);
      expect(mask2.zindex).toBe(1);
    });
  });

  describe('moveToBottommost()', () => {
    it('puts one under the rest of them', () => {
      const mask1 = GameTableMask.create('m1', 1, 1, 100) as unknown as Stackable;
      const mask2 = GameTableMask.create('m2', 1, 1, 100) as unknown as Stackable;
      const mask3 = GameTableMask.create('m3', 1, 1, 100) as unknown as Stackable;

      mask1.zindex = 0;
      mask2.zindex = 1;
      mask3.zindex = 2;

      moveToBottommost(mask3);
      expect(mask3.zindex).toBe(-1);
      expect(mask1.zindex).toBe(0);
    });

    it('leaves it alone when it is already at the bottom with nothing below', () => {
      const mask1 = GameTableMask.create('m1', 1, 1, 100) as unknown as Stackable;
      const mask2 = GameTableMask.create('m2', 1, 1, 100) as unknown as Stackable;

      mask1.zindex = 0;
      mask2.zindex = 1;

      moveToBottommost(mask1);
      expect(mask1.zindex).toBe(0);
    });

    it('renumbers the stack from the bottom once it has run far enough down', () => {
      const masks = Array.from(
        { length: 4 },
        (_, i) => GameTableMask.create(`m${i}`, 1, 1, 100) as unknown as Stackable
      );
      masks.forEach((mask, i) => (mask.zindex = i));
      masks[0].zindex = -400;

      moveToBottommost(masks[1]);

      expect(masks.map((m) => m.zindex).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    });
  });
});
