import {
  cellCenterOf,
  cellGridOf,
  cellIndexAt,
  cellIndexOf,
  forEachCell,
  forEachCellInBox,
} from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCellCenter, hexSpacing } from '@axe/domain/tabletop/hex-geometry';
import { describe, expect, it } from 'vitest';

describe('cell grid', () => {
  const square = cellGridOf(10, 8, 50, GridType.SQUARE);

  it('puts a square cell centre half a cell in from its corner', () => {
    expect(cellCenterOf(square, cellIndexOf(square, 0, 0))).toEqual({ x: 25, y: 25 });
    expect(cellCenterOf(square, cellIndexOf(square, 3, 2))).toEqual({ x: 175, y: 125 });
  });

  it('finds the cell a point falls in', () => {
    expect(cellIndexAt(square, 25, 25)).toBe(cellIndexOf(square, 0, 0));
    expect(cellIndexAt(square, 175, 125)).toBe(cellIndexOf(square, 3, 2));
  });

  it('has no cell off the board', () => {
    expect(cellIndexAt(square, -1, 10)).toBe(-1);
    expect(cellIndexAt(square, 10, -1)).toBe(-1);
    expect(cellIndexAt(square, 10_000, 10)).toBe(-1);
  });

  it('agrees with the hex geometry it shares with the grid lines', () => {
    const hex = cellGridOf(6, 6, 50, GridType.HEX_VERTICAL);
    const { colSpacing, rowSpacing } = hexSpacing(50, true);
    expect(cellCenterOf(hex, cellIndexOf(hex, 3, 2))).toEqual(hexCellCenter(3, 2, colSpacing, rowSpacing, true));
  });

  it('walks every cell once', () => {
    const seen = new Set<number>();
    forEachCell(square, (index) => seen.add(index));
    expect(seen.size).toBe(80);
  });

  it('keeps a box to the cells whose centres fall inside it', () => {
    const seen: number[] = [];
    forEachCellInBox(square, 0, 0, 100, 100, (index) => seen.push(index));
    expect(seen.sort((a, b) => a - b)).toEqual(
      [cellIndexOf(square, 0, 0), cellIndexOf(square, 1, 0), cellIndexOf(square, 0, 1), cellIndexOf(square, 1, 1)].sort(
        (a, b) => a - b
      )
    );
  });

  it('holds a box that reaches past the board', () => {
    const seen: number[] = [];
    forEachCellInBox(square, -10_000, -10_000, 10_000, 10_000, (index) => seen.push(index));
    expect(seen.length).toBe(80);
  });
});
