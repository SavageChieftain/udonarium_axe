import { GridType } from '@axe/domain/tabletop/game-table';
import {
  fillHexPath,
  hexCellCenter,
  hexCircumradius,
  hexSpacing,
  hexStartAngle,
  hexVertices,
  isFlatTopGrid,
  isHexGrid,
  pixelToHexCell,
  strokeHexPath,
} from '@axe/domain/tabletop/hex-geometry';

describe('hex-geometry', () => {
  describe('hexCircumradius', () => {
    it('gridSize / √3 を返す', () => {
      expect(hexCircumradius(50)).toBeCloseTo(50 / Math.sqrt(3));
    });
  });

  describe('isFlatTopGrid', () => {
    it('HEX_VERTICAL → true', () => {
      expect(isFlatTopGrid(GridType.HEX_VERTICAL)).toBe(true);
    });
    it('HEX_HORIZONTAL → false', () => {
      expect(isFlatTopGrid(GridType.HEX_HORIZONTAL)).toBe(false);
    });
    it('SQUARE → false', () => {
      expect(isFlatTopGrid(GridType.SQUARE)).toBe(false);
    });
  });

  describe('isHexGrid', () => {
    it('HEX_VERTICAL → true', () => {
      expect(isHexGrid(GridType.HEX_VERTICAL)).toBe(true);
    });
    it('HEX_HORIZONTAL → true', () => {
      expect(isHexGrid(GridType.HEX_HORIZONTAL)).toBe(true);
    });
    it('SQUARE → false', () => {
      expect(isHexGrid(GridType.SQUARE)).toBe(false);
    });
    it('NONE → false', () => {
      expect(isHexGrid(GridType.NONE)).toBe(false);
    });
  });

  describe('hexSpacing', () => {
    const g = 50;
    const s = hexCircumradius(g);

    it('flat-top: colSpacing = 1.5s, rowSpacing = gridSize', () => {
      const sp = hexSpacing(g, true);
      expect(sp.colSpacing).toBeCloseTo(1.5 * s);
      expect(sp.rowSpacing).toBe(g);
    });

    it('pointy-top: colSpacing = gridSize, rowSpacing = 1.5s', () => {
      const sp = hexSpacing(g, false);
      expect(sp.colSpacing).toBe(g);
      expect(sp.rowSpacing).toBeCloseTo(1.5 * s);
    });
  });

  describe('hexStartAngle', () => {
    it('flat-top → 0', () => {
      expect(hexStartAngle(true)).toBe(0);
    });
    it('pointy-top → -π/2', () => {
      expect(hexStartAngle(false)).toBe(-Math.PI / 2);
    });
  });

  describe('hexCellCenter', () => {
    const g = 50;
    const sp = hexSpacing(g, true);

    it('flat-top (0,0) → 原点', () => {
      const c = hexCellCenter(0, 0, sp.colSpacing, sp.rowSpacing, true);
      expect(c.x).toBe(0);
      expect(c.y).toBe(0);
    });

    it('flat-top 奇数列で半行オフセット', () => {
      const even = hexCellCenter(0, 2, sp.colSpacing, sp.rowSpacing, true);
      const odd = hexCellCenter(1, 2, sp.colSpacing, sp.rowSpacing, true);
      expect(Math.abs(even.y - odd.y)).toBeCloseTo(sp.rowSpacing / 2);
    });

    it('pointy-top 奇数行で半列オフセット', () => {
      const spP = hexSpacing(g, false);
      const even = hexCellCenter(2, 0, spP.colSpacing, spP.rowSpacing, false);
      const odd = hexCellCenter(2, 1, spP.colSpacing, spP.rowSpacing, false);
      expect(Math.abs(even.x - odd.x)).toBeCloseTo(spP.colSpacing / 2);
    });

    it('負のインデックスでもオフセットが正しい', () => {
      const c = hexCellCenter(-1, 0, sp.colSpacing, sp.rowSpacing, true);
      expect(c.x).toBeCloseTo(-sp.colSpacing);
      expect(c.y).toBeCloseTo(sp.rowSpacing / 2); // abs(-1) % 2 === 1
    });
  });

  describe('hexVertices', () => {
    it('6頂点を返す', () => {
      const verts = hexVertices(0, 0, 10, 0);
      expect(verts).toHaveLength(6);
    });

    it('各頂点が中心から circumradius 距離にある', () => {
      const s = 10;
      const verts = hexVertices(5, 5, s, 0);
      for (const v of verts) {
        const dist = Math.sqrt((v.x - 5) ** 2 + (v.y - 5) ** 2);
        expect(dist).toBeCloseTo(s);
      }
    });
  });

  describe('strokeHexPath', () => {
    it('beginPath, moveTo, lineTo×5, closePath, stroke を呼ぶ', () => {
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      strokeHexPath(ctx, 0, 0, 10, 0);
      expect(ctx.beginPath).toHaveBeenCalledOnce();
      expect(ctx.moveTo).toHaveBeenCalledOnce();
      expect(ctx.lineTo).toHaveBeenCalledTimes(5);
      expect(ctx.closePath).toHaveBeenCalledOnce();
      expect(ctx.stroke).toHaveBeenCalledOnce();
    });
  });

  describe('fillHexPath', () => {
    it('beginPath, moveTo, lineTo×5, closePath, fill を呼ぶ', () => {
      const ctx = {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      fillHexPath(ctx, 0, 0, 10, 0);
      expect(ctx.beginPath).toHaveBeenCalledOnce();
      expect(ctx.moveTo).toHaveBeenCalledOnce();
      expect(ctx.lineTo).toHaveBeenCalledTimes(5);
      expect(ctx.closePath).toHaveBeenCalledOnce();
      expect(ctx.fill).toHaveBeenCalledOnce();
    });
  });

  describe('pixelToHexCell', () => {
    it('flat-top (0,0) のセル中心に最も近いセルは (0,0) であること', () => {
      const result = pixelToHexCell(0, 0, 50, true);
      expect(result).toEqual({ col: 0, row: 0 });
    });

    it('flat-top で colSpacing の 1.5 倍地点は col=1 に近いこと', () => {
      const { colSpacing } = hexSpacing(50, true);
      const result = pixelToHexCell(colSpacing * 1.1, 0, 50, true);
      expect(result.col).toBe(1);
    });

    it('pointy-top (0,0) のセル中心に最も近いセルは (0,0) であること', () => {
      const result = pixelToHexCell(0, 0, 50, false);
      expect(result).toEqual({ col: 0, row: 0 });
    });

    it('pointy-top で rowSpacing の 1.5 倍地点は row=1 に近いこと', () => {
      const { rowSpacing } = hexSpacing(50, false);
      const result = pixelToHexCell(0, rowSpacing * 1.1, 50, false);
      expect(result.row).toBe(1);
    });

    it('flat-top でマスク領域内の任意地点が正の col/row を返すこと', () => {
      const result = pixelToHexCell(200, 150, 50, true);
      expect(result.col).toBeGreaterThanOrEqual(0);
      expect(result.row).toBeGreaterThanOrEqual(0);
    });
  });
});
