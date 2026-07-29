import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCircumradius, hexSpacing, isFlatTopGrid } from '@axe/domain/tabletop/hex-geometry';
import { HEX_SURFACE_INFLATE_PX, hexSurfaceCells } from '@axe/domain/tabletop/surface-cells';
import { describe, expect, it } from 'vitest';

describe('hexSurfaceCells', () => {
  it('マス目でないグリッドでは空を返す', () => {
    expect(hexSurfaceCells(4, 4, 50, GridType.SQUARE)).toEqual([]);
    expect(hexSurfaceCells(4, 4, 50, GridType.NONE)).toEqual([]);
  });

  it('不正な寸法では空を返す', () => {
    expect(hexSurfaceCells(0, 4, 50, GridType.HEX_VERTICAL)).toEqual([]);
    expect(hexSurfaceCells(4, 0, 50, GridType.HEX_VERTICAL)).toEqual([]);
    expect(hexSurfaceCells(4, 4, 0, GridType.HEX_VERTICAL)).toEqual([]);
  });

  it('全マス分の六角形を返す', () => {
    const cells = hexSurfaceCells(4, 3, 50, GridType.HEX_VERTICAL);

    expect(cells).toHaveLength(12);
    for (const cell of cells) expect(cell).toHaveLength(6);
  });

  it('先頭マスの中心は原点で、頂点は外接円上にある', () => {
    const cells = hexSurfaceCells(2, 2, 50, GridType.HEX_VERTICAL);
    const first = cells[0];
    const cx = first.reduce((sum, p) => sum + p.x, 0) / first.length;
    const cy = first.reduce((sum, p) => sum + p.y, 0) / first.length;

    expect(cx).toBeCloseTo(0, 6);
    expect(cy).toBeCloseTo(0, 6);
    for (const point of first) expect(Math.hypot(point.x - cx, point.y - cy)).toBeCloseTo(hexCircumradius(50), 6);
  });

  it('inflatePx の分だけ六角形を広げる', () => {
    const cells = hexSurfaceCells(1, 1, 50, GridType.HEX_HORIZONTAL, HEX_SURFACE_INFLATE_PX);
    const [cell] = cells;
    const cx = cell.reduce((sum, p) => sum + p.x, 0) / cell.length;
    const cy = cell.reduce((sum, p) => sum + p.y, 0) / cell.length;

    for (const point of cell) {
      expect(Math.hypot(point.x - cx, point.y - cy)).toBeCloseTo(hexCircumradius(50) + HEX_SURFACE_INFLATE_PX, 6);
    }
  });

  it('端のマス中心から外接円ぶんだけ広がる', () => {
    const gridSize = 50;
    const cols = 5;
    const rows = 4;
    const cells = hexSurfaceCells(cols, rows, gridSize, GridType.HEX_VERTICAL, HEX_SURFACE_INFLATE_PX);
    const { colSpacing } = hexSpacing(gridSize, isFlatTopGrid(GridType.HEX_VERTICAL));
    const reach = hexCircumradius(gridSize) + HEX_SURFACE_INFLATE_PX;
    const points = cells.flat();

    expect(Math.min(...points.map((p) => p.x))).toBeCloseTo(-reach, 6);
    expect(Math.max(...points.map((p) => p.x))).toBeCloseTo((cols - 1) * colSpacing + reach, 6);
  });
});
