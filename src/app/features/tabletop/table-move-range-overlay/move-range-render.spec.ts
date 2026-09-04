import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import { moveRangeOutline, moveRangePolygons } from '@axe/features/tabletop/table-move-range-overlay/move-range-render';
import { describe, expect, it } from 'vitest';

function bitsOf(count: number, indexes: number[]): CellBits {
  const bits = new CellBits(count);
  for (const index of indexes) bits.set(index);
  return bits;
}

describe('the shape a reach is drawn as', () => {
  const grid = cellGridOf(6, 6, 50, GridType.SQUARE);

  it('gives one polygon per cell reached', () => {
    const bits = bitsOf(cellCount(grid), [cellIndexOf(grid, 1, 1), cellIndexOf(grid, 2, 1)]);
    const polygons = moveRangePolygons(grid, bits);
    expect(polygons).toHaveLength(2);
    expect(polygons[0]).toHaveLength(4);
  });

  it('draws all four sides of a cell standing on its own', () => {
    const bits = bitsOf(cellCount(grid), [cellIndexOf(grid, 2, 2)]);
    expect(moveRangeOutline(grid, bits)).toHaveLength(4);
  });

  it('leaves out the side two cells share', () => {
    const bits = bitsOf(cellCount(grid), [cellIndexOf(grid, 2, 2), cellIndexOf(grid, 3, 2)]);
    expect(moveRangeOutline(grid, bits)).toHaveLength(6);
  });

  it('draws all six sides of a hex standing on its own', () => {
    for (const type of [GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      const hex = cellGridOf(6, 6, 50, type);
      const bits = bitsOf(cellCount(hex), [cellIndexOf(hex, 2, 2)]);
      expect(moveRangeOutline(hex, bits)).toHaveLength(6);
    }
  });

  it('leaves out the side two hexes share', () => {
    for (const type of [GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      const hex = cellGridOf(6, 6, 50, type);
      const bits = bitsOf(cellCount(hex), [cellIndexOf(hex, 2, 2), cellIndexOf(hex, 2, 3)]);
      expect(moveRangeOutline(hex, bits)).toHaveLength(10);
    }
  });
});
