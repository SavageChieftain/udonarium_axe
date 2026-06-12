import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCellCenter, hexSpacing, isFlatTopGrid } from '@axe/domain/tabletop/hex-geometry';
import { cellCenter, cellNeighbors, pointToCell } from '@axe/features/map-maker/model/grid-cells';
import { describe, expect, it } from 'vitest';

const CELL = 64;

function minHexSpacing(gridType: GridType): number {
  const flatTop = isFlatTopGrid(gridType);
  const { colSpacing, rowSpacing } = hexSpacing(CELL, flatTop);
  return flatTop ? rowSpacing : colSpacing;
}

describe('cellNeighbors square', () => {
  it('returns the 4 orthogonal neighbors', () => {
    const n = cellNeighbors(GridType.SQUARE, 3, 5);
    expect(n).toHaveLength(4);
    expect(n).toContainEqual([2, 5]);
    expect(n).toContainEqual([4, 5]);
    expect(n).toContainEqual([3, 4]);
    expect(n).toContainEqual([3, 6]);
  });
});

describe('cellNeighbors hex distance parity', () => {
  for (const gridType of [GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
    const flatTop = isFlatTopGrid(gridType);
    const { colSpacing, rowSpacing } = hexSpacing(CELL, flatTop);
    const expected = minHexSpacing(gridType);

    it(`gives 6 equidistant neighbors for gridType ${gridType}`, () => {
      const cells: [number, number][] = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 3],
        [3, 2],
        [4, 4],
        [5, 6],
      ];
      for (const [col, row] of cells) {
        const center = hexCellCenter(col, row, colSpacing, rowSpacing, flatTop);
        const neighbors = cellNeighbors(gridType, col, row);
        expect(neighbors).toHaveLength(6);
        const keys = new Set(neighbors.map(([c, r]) => `${c},${r}`));
        expect(keys.size).toBe(6);
        for (const [nc, nr] of neighbors) {
          const nCenter = hexCellCenter(nc, nr, colSpacing, rowSpacing, flatTop);
          const dist = Math.hypot(nCenter.x - center.x, nCenter.y - center.y);
          expect(Math.abs(dist - expected)).toBeLessThan(1e-6);
        }
      }
    });
  }
});

describe('pointToCell <-> cellCenter round-trip', () => {
  for (const gridType of [GridType.SQUARE, GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
    it(`recovers the cell from its own center for gridType ${gridType}`, () => {
      for (let col = 0; col < 6; col += 1) {
        for (let row = 0; row < 6; row += 1) {
          const { x, y } = cellCenter(gridType, col, row, CELL);
          const back = pointToCell(gridType, x, y, CELL);
          expect(back.col).toBe(col);
          expect(back.row).toBe(row);
        }
      }
    });
  }
});
