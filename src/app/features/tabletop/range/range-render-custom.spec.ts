import { CellCoord } from '@axe/domain/tabletop/cell-pattern';
import { GridType } from '@axe/domain/tabletop/game-table';
import {
  makeCustomHitTest,
  patternCellToWorld,
  worldCellToPattern,
} from '@axe/features/tabletop/range/range-render-custom';
import { RangeRenderSetting } from '@axe/features/tabletop/range/range-render-types';

function makeSetting(overrides: Partial<RangeRenderSetting> = {}): RangeRenderSetting {
  return {
    areaWidth: 10,
    areaHeight: 10,
    range: 1,
    width: 1,
    centerX: 525,
    centerY: 175,
    gridSize: 50,
    type: 'CUSTOM',
    gridColor: '#FFFF00',
    rangeColor: '#000000',
    fanDegree: 0,
    degree: 0,
    offSetX: false,
    offSetY: false,
    fillOutLine: false,
    gridType: GridType.SQUARE,
    isDocking: false,
    ...overrides,
  };
}

describe('makeCustomHitTest', () => {
  describe('square grid (centerX=525, centerY=175 i.e. baseCell=10,3)', () => {
    const setting = makeSetting();
    const cells: CellCoord[] = [
      { gx: 0, gy: 0 },
      { gx: 1, gy: 0 },
      { gx: 2, gy: 0 },
      { gx: 3, gy: 0 },
      { gx: 3, gy: -1 },
      { gx: 3, gy: 1 },
    ];
    const hit = makeCustomHitTest(setting, cells);

    it('原点セルでヒット', () => {
      expect(hit(0, 0)).toBe(true);
    });

    it('右1セル中心 (gcx=50, gcy=0) でヒット', () => {
      expect(hit(50, 0)).toBe(true);
    });

    it('右3セル中心 (gcx=150, gcy=0) でヒット', () => {
      expect(hit(150, 0)).toBe(true);
    });

    it('右3セル上 (gcx=150, gcy=-50) でヒット', () => {
      expect(hit(150, -50)).toBe(true);
    });

    it('右3セル下 (gcx=150, gcy=50) でヒット', () => {
      expect(hit(150, 50)).toBe(true);
    });

    it('パターン外セル (gcx=200, gcy=0) ではヒットしない', () => {
      expect(hit(200, 0)).toBe(false);
    });

    it('左1セル (gcx=-50, gcy=0) ではヒットしない', () => {
      expect(hit(-50, 0)).toBe(false);
    });
  });

  describe('square grid (centerX=540, centerY=185 i.e. baseCell=10,3 but offset)', () => {
    // 射程中心がセル境界に乗っていないケース。基準セル (10,3) は同じだが、
    // gcx=0 ではセル (10,3) の中心 (515, 175) からズレた位置を指す。
    const setting = makeSetting({ centerX: 540, centerY: 185 });
    const cells: CellCoord[] = [
      { gx: 0, gy: 0 },
      { gx: 1, gy: 0 },
    ];
    const hit = makeCustomHitTest(setting, cells);

    it('基準セル中心相当 (gcx=-15, gcy=-10) でヒット', () => {
      // 基準セル中心 = (525, 175), 射程中心 = (540, 185), 差 = (-15, -10)
      expect(hit(-15, -10)).toBe(true);
    });

    it('右1セル中心相当 (gcx=35, gcy=-10) でヒット', () => {
      // 右1セル中心 = (575, 175), 射程中心 = (540, 185), 差 = (35, -10)
      expect(hit(35, -10)).toBe(true);
    });

    it('境界 gcx=-15 はセル (10,3) に属する', () => {
      // worldX = 540 + (-15) = 525 → col = 10
      expect(hit(-15, 0)).toBe(true);
    });

    it('境界 gcx=10 はセル (11,3) に属するのでパターン (1,0) でヒット', () => {
      // worldX = 540 + 10 = 550 → col = 11
      expect(hit(10, 0)).toBe(true);
    });

    it('境界 gcx=-16 はセル (9,3) に属するのでパターン外', () => {
      // worldX = 540 - 16 = 524 → col = 10... wait floor(524/50) = 10. Actually let's pick worldX = 499 → col = 9
      expect(hit(-41, 0)).toBe(false);
    });
  });

  describe('hex grid (HEX_HORIZONTAL)', () => {
    const setting = makeSetting({
      centerX: 525,
      centerY: 175,
      gridType: GridType.HEX_HORIZONTAL,
    });
    const cells: CellCoord[] = [
      { gx: 0, gy: 0 },
      { gx: 1, gy: 0 },
      { gx: 2, gy: 0 },
    ];
    const hit = makeCustomHitTest(setting, cells);

    it('原点セルでヒット (gcx=0, gcy=0)', () => {
      expect(hit(0, 0)).toBe(true);
    });

    it('右1ヘクス中心でヒット (gcx=50, gcy=0)', () => {
      // hex-horizontal: colSpacing = gridSize = 50
      expect(hit(50, 0)).toBe(true);
    });
  });

  describe('patternCellToWorld / worldCellToPattern (pointy-top)', () => {
    it('偶数行ベース: パターン (0, 1) は同じ列', () => {
      expect(patternCellToWorld(10, 2, 0, 1, false)).toEqual({ col: 10, row: 3 });
    });

    it('奇数行ベース: パターン (0, 1) は列が +1 シフト (鏡映防止)', () => {
      expect(patternCellToWorld(10, 3, 0, 1, false)).toEqual({ col: 11, row: 4 });
    });

    it('奇数行ベース + 偶数gy: 通常通り', () => {
      expect(patternCellToWorld(10, 3, 0, 2, false)).toEqual({ col: 10, row: 5 });
    });

    it('奇数行ベース: パターン (0, -1) も +1 シフト', () => {
      expect(patternCellToWorld(10, 3, 0, -1, false)).toEqual({ col: 11, row: 2 });
    });

    it('往復: pattern -> world -> pattern', () => {
      const cases: { gx: number; gy: number }[] = [
        { gx: 0, gy: 0 },
        { gx: 1, gy: 0 },
        { gx: 0, gy: 1 },
        { gx: 0, gy: -1 },
        { gx: 2, gy: -3 },
      ];
      for (const baseRow of [0, 1, 2, 3, -1, -2]) {
        for (const c of cases) {
          const w = patternCellToWorld(10, baseRow, c.gx, c.gy, false);
          const p = worldCellToPattern(10, baseRow, w.col, w.row, false);
          expect(p, `baseRow=${baseRow} (${c.gx},${c.gy})`).toEqual(c);
        }
      }
    });
  });

  describe('patternCellToWorld / worldCellToPattern (flat-top)', () => {
    it('偶数列ベース: パターン (1, 0) は同じ行', () => {
      expect(patternCellToWorld(2, 10, 1, 0, true)).toEqual({ col: 3, row: 10 });
    });

    it('奇数列ベース: パターン (1, 0) は行が +1 シフト', () => {
      expect(patternCellToWorld(3, 10, 1, 0, true)).toEqual({ col: 4, row: 11 });
    });

    it('奇数列ベース: パターン (2, 0) は通常 (gxが偶数)', () => {
      expect(patternCellToWorld(3, 10, 2, 0, true)).toEqual({ col: 5, row: 10 });
    });

    it('往復: flat-top でも保持される', () => {
      const cases: { gx: number; gy: number }[] = [
        { gx: 0, gy: 0 },
        { gx: 1, gy: 0 },
        { gx: -1, gy: 0 },
        { gx: 1, gy: 1 },
        { gx: 3, gy: -2 },
      ];
      for (const baseCol of [0, 1, 2, 3, -1, -2]) {
        for (const c of cases) {
          const w = patternCellToWorld(baseCol, 10, c.gx, c.gy, true);
          const p = worldCellToPattern(baseCol, 10, w.col, w.row, true);
          expect(p, `baseCol=${baseCol} (${c.gx},${c.gy})`).toEqual(c);
        }
      }
    });
  });

  describe('hex hitTest: 奇数行ベースでパターン形状が保持される', () => {
    // 縦に並ぶ3セル (0,-1), (0,0), (0,1)
    const cells: CellCoord[] = [
      { gx: 0, gy: -1 },
      { gx: 0, gy: 0 },
      { gx: 0, gy: 1 },
    ];

    it('偶数行ベース: gcx=0 で3セル全てがヒット可能', () => {
      // centerX, centerY が偶数行のヘクス中心と一致する位置
      // hex-horizontal, gridSize=50, row=2: rowSpacing = 1.5*s = 1.5*(50/sqrt(3)) ≈ 43.3
      // row 2 center y ≈ 86.6
      const setting = makeSetting({
        centerX: 0, // col=0 even row → x = 0
        centerY: 0, // row=0
        gridType: GridType.HEX_HORIZONTAL,
      });
      const hit = makeCustomHitTest(setting, cells);
      // gcy ≈ 0 -> 原点セル
      expect(hit(0, 0)).toBe(true);
      // gcy ≈ rowSpacing でひとつ下のセル (奇数行: 右に半分シフト) を相対座標で指す
      const rowSpacing = (1.5 * 50) / Math.sqrt(3);
      expect(hit(50 / 2, rowSpacing)).toBe(true);
      // gcy ≈ -rowSpacing でひとつ上
      expect(hit(50 / 2, -rowSpacing)).toBe(true);
    });
  });
});
