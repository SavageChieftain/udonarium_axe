import { GridType } from '@axe/domain/tabletop/game-table';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  applyPointerEvents,
  calcHexSnapPosition,
  calcSnapNum,
  collectCollidableElements,
  shouldTransitionTo,
  toTransformCss,
} from '@axe/shared/directives/movable-helpers';

describe('movable-helpers', () => {
  describe('calcSnapNum', () => {
    it('interval が 0 以下なら元の値を返す', () => {
      expect(calcSnapNum(13, 0)).toBe(13);
      expect(calcSnapNum(13, -1)).toBe(13);
    });

    it('正数をグリッドに丸める', () => {
      expect(calcSnapNum(13, 25)).toBe(25);
      expect(calcSnapNum(36, 25)).toBe(25);
    });

    it('負数をグリッドに丸める', () => {
      expect(calcSnapNum(-13, 25)).toBe(-25);
      expect(calcSnapNum(-36, 25)).toBe(-25);
    });
  });

  describe('toTransformCss', () => {
    it('translate3d 文字列を返す', () => {
      expect(toTransformCss(1, 2, 3, 'scale(2)')).toBe('translate3d(1px,2px,3px) scale(2)');
    });
  });

  describe('shouldTransitionTo', () => {
    it('object または location がなければ false', () => {
      expect(shouldTransitionTo(null, 0, 0, 0)).toBe(false);
      expect(shouldTransitionTo({} as TabletopObject, 0, 0, 0)).toBe(false);
    });

    it('位置が異なれば true', () => {
      const object = {
        location: { x: 1, y: 2 },
        posZ: 3,
      } as TabletopObject;
      expect(shouldTransitionTo(object, 0, 0, 0)).toBe(true);
    });

    it('位置が同じなら false', () => {
      const object = {
        location: { x: 1, y: 2 },
        posZ: 3,
      } as TabletopObject;
      expect(shouldTransitionTo(object, 1, 2, 3)).toBe(false);
    });
  });

  describe('collectCollidableElements / applyPointerEvents', () => {
    it('root が collidable なら root のみ返す', () => {
      const root = document.createElement('div');
      root.style.pointerEvents = 'auto';
      const result = collectCollidableElements(root);
      expect(result).toEqual([root]);
    });

    it('root が non-collidable なら子要素から収集する', () => {
      const root = document.createElement('div');
      root.style.pointerEvents = 'none';
      const child = document.createElement('span');
      child.style.pointerEvents = 'auto';
      root.appendChild(child);
      const result = collectCollidableElements(root);
      expect(result).toEqual([child]);
    });

    it('applyPointerEvents で一括反映できる', () => {
      const a = document.createElement('div');
      const b = document.createElement('span');
      applyPointerEvents([a, b], false);
      expect(a.style.pointerEvents).toBe('none');
      expect(b.style.pointerEvents).toBe('none');
      applyPointerEvents([a, b], true);
      expect(a.style.pointerEvents).toBe('auto');
      expect(b.style.pointerEvents).toBe('auto');
    });
  });

  describe('calcHexSnapPosition', () => {
    const gridSize = 50;
    const s = gridSize / Math.sqrt(3);

    describe('flat-top (HEX_VERTICAL)', () => {
      const colSpacing = 1.5 * s;

      it('原点付近のポイントを (0,0) ヘクス中心にスナップ', () => {
        const result = calcHexSnapPosition(5, 5, gridSize, GridType.HEX_VERTICAL);
        expect(result.x).toBeCloseTo(-gridSize / 2);
        expect(result.y).toBeCloseTo(-gridSize / 2);
      });

      it('col=1 のヘクス中心にスナップ（奇数列は半行オフセット）', () => {
        const cx = colSpacing;
        const cy = gridSize / 2;
        const result = calcHexSnapPosition(cx, cy, gridSize, GridType.HEX_VERTICAL);
        expect(result.x).toBeCloseTo(cx - gridSize / 2);
        expect(result.y).toBeCloseTo(cy - gridSize / 2);
      });

      it('2つのヘクスの中間点は近い方にスナップ', () => {
        const cx0 = 0;
        const cx1 = colSpacing;
        const midX = (cx0 + cx1) / 2 - 1;
        const result = calcHexSnapPosition(midX, 0, gridSize, GridType.HEX_VERTICAL);
        expect(result.x).toBeCloseTo(cx0 - gridSize / 2);
        expect(result.y).toBeCloseTo(-gridSize / 2);
      });
    });

    describe('pointy-top (HEX_HORIZONTAL)', () => {
      const rowSpacing = 1.5 * s;

      it('原点付近のポイントを (0,0) ヘクス中心にスナップ', () => {
        const result = calcHexSnapPosition(5, 5, gridSize, GridType.HEX_HORIZONTAL);
        expect(result.x).toBeCloseTo(-gridSize / 2);
        expect(result.y).toBeCloseTo(-gridSize / 2);
      });

      it('row=1 のヘクス中心にスナップ（奇数行は半列オフセット）', () => {
        const cx = gridSize / 2;
        const cy = rowSpacing;
        const result = calcHexSnapPosition(cx, cy, gridSize, GridType.HEX_HORIZONTAL);
        expect(result.x).toBeCloseTo(cx - gridSize / 2);
        expect(result.y).toBeCloseTo(cy - gridSize / 2);
      });

      it('2つのヘクスの中間点は近い方にスナップ', () => {
        const cy0 = 0;
        const cy1 = rowSpacing;
        const midY = (cy0 + cy1) / 2 - 1;
        const result = calcHexSnapPosition(0, midY, gridSize, GridType.HEX_HORIZONTAL);
        expect(result.x).toBeCloseTo(-gridSize / 2);
        expect(result.y).toBeCloseTo(cy0 - gridSize / 2);
      });
    });
  });
});
