import { GridType } from '@axe/domain/tabletop/game-table';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  applyPointerEvents,
  calcHexAllSnapPosition,
  calcHexBothSnapPosition,
  calcHexEdgeMidpointSnapPosition,
  calcHexSnapPosition,
  calcHexVertexSnapPosition,
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

  describe('calcHexVertexSnapPosition', () => {
    const gridSize = 50;
    const s = gridSize / Math.sqrt(3);

    describe('flat-top (HEX_VERTICAL)', () => {
      it('原点付近のポイントをセル中心ではなく頂点にスナップ', () => {
        // flat-top (0,0) hex center is at (0,0), vertex at angle 0 is at (s,0)
        const result = calcHexVertexSnapPosition(s, 0, gridSize, GridType.HEX_VERTICAL);
        expect(result.x).toBeCloseTo(s - gridSize / 2);
        expect(result.y).toBeCloseTo(0 - gridSize / 2);
      });

      it('セル中心位置でも最近接頂点にスナップ', () => {
        // (0,0) hex center → nearest vertex is at distance s
        const result = calcHexVertexSnapPosition(0, 0, gridSize, GridType.HEX_VERTICAL);
        // Should snap to one of the 6 vertices of (0,0) hex, distance s from center
        const snappedCenterX = result.x + gridSize / 2;
        const snappedCenterY = result.y + gridSize / 2;
        const dist = Math.sqrt(snappedCenterX * snappedCenterX + snappedCenterY * snappedCenterY);
        expect(dist).toBeCloseTo(s);
      });
    });

    describe('pointy-top (HEX_HORIZONTAL)', () => {
      it('原点付近のポイントをセル中心ではなく頂点にスナップ', () => {
        // pointy-top (0,0) hex center is at (0,0), vertex at angle -90° is at (0,-s)
        const result = calcHexVertexSnapPosition(0, -s, gridSize, GridType.HEX_HORIZONTAL);
        expect(result.x).toBeCloseTo(0 - gridSize / 2);
        expect(result.y).toBeCloseTo(-s - gridSize / 2);
      });

      it('セル中心位置でも最近接頂点にスナップ', () => {
        const result = calcHexVertexSnapPosition(0, 0, gridSize, GridType.HEX_HORIZONTAL);
        const snappedCenterX = result.x + gridSize / 2;
        const snappedCenterY = result.y + gridSize / 2;
        const dist = Math.sqrt(snappedCenterX * snappedCenterX + snappedCenterY * snappedCenterY);
        expect(dist).toBeCloseTo(s);
      });
    });
  });

  describe('calcHexBothSnapPosition', () => {
    const gridSize = 50;

    it('セル中心に近い場合はセル中心にスナップ', () => {
      // (0,0) hex center → should snap to center
      const result = calcHexBothSnapPosition(1, 1, gridSize, GridType.HEX_VERTICAL);
      const centerResult = calcHexSnapPosition(1, 1, gridSize, GridType.HEX_VERTICAL);
      expect(result.x).toBeCloseTo(centerResult.x);
      expect(result.y).toBeCloseTo(centerResult.y);
    });

    it('頂点に近い場合は頂点にスナップ', () => {
      const s = gridSize / Math.sqrt(3);
      // flat-top vertex at (s, 0) — very close to vertex
      const result = calcHexBothSnapPosition(s - 0.1, 0, gridSize, GridType.HEX_VERTICAL);
      const vertexResult = calcHexVertexSnapPosition(s - 0.1, 0, gridSize, GridType.HEX_VERTICAL);
      expect(result.x).toBeCloseTo(vertexResult.x);
      expect(result.y).toBeCloseTo(vertexResult.y);
    });
  });

  describe('calcHexEdgeMidpointSnapPosition', () => {
    const gridSize = 50;
    // inradius = gridSize / 2 = 25

    it('flat-top: 30°方向の辺中点にスナップ', () => {
      // flat-top の 30° 方向の辺中点: (inradius*cos30°, inradius*sin30°)
      const inradius = gridSize / 2;
      const mx = inradius * Math.cos(Math.PI / 6);
      const my = inradius * Math.sin(Math.PI / 6);
      const result = calcHexEdgeMidpointSnapPosition(mx - 0.5, my, gridSize, GridType.HEX_VERTICAL);
      expect(result.x + gridSize / 2).toBeCloseTo(mx);
      expect(result.y + gridSize / 2).toBeCloseTo(my);
    });

    it('pointy-top: 0°方向の辺中点にスナップ', () => {
      // pointy-top の 0° 方向の辺中点: (inradius, 0) = (25, 0)
      const inradius = gridSize / 2;
      const result = calcHexEdgeMidpointSnapPosition(inradius - 0.5, 0, gridSize, GridType.HEX_HORIZONTAL);
      expect(result.x + gridSize / 2).toBeCloseTo(inradius);
      expect(result.y + gridSize / 2).toBeCloseTo(0);
    });

    it('スナップ後の辺中点はセル中心から inradius の距離にある', () => {
      const inradius = gridSize / 2;
      const mx = inradius * Math.cos(Math.PI / 6);
      const my = inradius * Math.sin(Math.PI / 6);
      const result = calcHexEdgeMidpointSnapPosition(mx, my, gridSize, GridType.HEX_VERTICAL);
      const cx = result.x + gridSize / 2;
      const cy = result.y + gridSize / 2;
      expect(Math.sqrt(cx * cx + cy * cy)).toBeCloseTo(inradius);
    });
  });

  describe('calcHexAllSnapPosition', () => {
    const gridSize = 50;

    it('セル中心に近い場合はセル中心にスナップ', () => {
      const result = calcHexAllSnapPosition(1, 1, gridSize, GridType.HEX_VERTICAL);
      const centerResult = calcHexSnapPosition(1, 1, gridSize, GridType.HEX_VERTICAL);
      expect(result.x).toBeCloseTo(centerResult.x);
      expect(result.y).toBeCloseTo(centerResult.y);
    });

    it('頂点に近い場合は頂点にスナップ', () => {
      const s = gridSize / Math.sqrt(3);
      const result = calcHexAllSnapPosition(s - 0.1, 0, gridSize, GridType.HEX_VERTICAL);
      const vertexResult = calcHexVertexSnapPosition(s - 0.1, 0, gridSize, GridType.HEX_VERTICAL);
      expect(result.x).toBeCloseTo(vertexResult.x);
      expect(result.y).toBeCloseTo(vertexResult.y);
    });

    it('辺中点に近い場合は辺中点にスナップ', () => {
      // flat-top 30° 方向の辺中点付近
      const inradius = gridSize / 2;
      const mx = inradius * Math.cos(Math.PI / 6);
      const my = inradius * Math.sin(Math.PI / 6);
      const result = calcHexAllSnapPosition(mx - 0.5, my, gridSize, GridType.HEX_VERTICAL);
      const edgeResult = calcHexEdgeMidpointSnapPosition(mx - 0.5, my, gridSize, GridType.HEX_VERTICAL);
      expect(result.x).toBeCloseTo(edgeResult.x);
      expect(result.y).toBeCloseTo(edgeResult.y);
    });
  });
});
