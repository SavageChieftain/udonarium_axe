import { cellColRow, cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import { moveNeighboursOf } from '@axe/domain/tabletop/move/move-neighbours';
import { describe, expect, it } from 'vitest';

function around(cols: number, rows: number, type: GridType, col: number, row: number): string[] {
  const grid = cellGridOf(cols, rows, 50, type);
  return moveNeighboursOf(grid, cellIndexOf(grid, col, row))
    .map((index) => cellColRow(grid, index))
    .map((cell) => `${cell.col},${cell.row}`)
    .sort();
}

describe('the cells a step reaches on squares', () => {
  it('counts a step cornerways as one cell, so a square has eight of them', () => {
    expect(around(6, 6, GridType.SQUARE, 2, 2)).toEqual(
      ['1,1', '2,1', '3,1', '1,2', '3,2', '1,3', '2,3', '3,3'].sort()
    );
  });

  it('has only what is on the board at a corner', () => {
    expect(around(6, 6, GridType.SQUARE, 0, 0)).toEqual(['1,0', '0,1', '1,1'].sort());
  });
});

describe('the cells a step reaches on flat-topped hexes', () => {
  it('goes up and down its own column and up-and-across the two beside it, from an even column', () => {
    expect(around(6, 6, GridType.HEX_VERTICAL, 2, 2)).toEqual(['2,1', '2,3', '1,1', '1,2', '3,1', '3,2'].sort());
  });

  it('goes down-and-across instead, from an odd column', () => {
    expect(around(6, 6, GridType.HEX_VERTICAL, 3, 2)).toEqual(['3,1', '3,3', '2,2', '2,3', '4,2', '4,3'].sort());
  });
});

describe('the cells a step reaches on pointy-topped hexes', () => {
  it('goes left and right along its own row and left-and-across the two beside it, from an even row', () => {
    expect(around(6, 6, GridType.HEX_HORIZONTAL, 2, 2)).toEqual(['1,2', '3,2', '1,1', '2,1', '1,3', '2,3'].sort());
  });

  it('goes right-and-across instead, from an odd row', () => {
    expect(around(6, 6, GridType.HEX_HORIZONTAL, 2, 3)).toEqual(['1,3', '3,3', '2,2', '3,2', '2,4', '3,4'].sort());
  });
});

describe('a square board that forbids corners', () => {
  it('steps four ways rather than eight', () => {
    const grid = cellGridOf(5, 5, 50, GridType.SQUARE);
    const middle = cellIndexOf(grid, 2, 2);

    expect(moveNeighboursOf(grid, middle, false)).toHaveLength(4);
    expect(moveNeighboursOf(grid, middle, false)).not.toContain(cellIndexOf(grid, 3, 3));
    expect(moveNeighboursOf(grid, middle, true)).toHaveLength(8);
  });

  it('leaves a hex board its six ways either way, having no corners to cut', () => {
    const grid = cellGridOf(5, 5, 50, GridType.HEX_VERTICAL);
    const middle = cellIndexOf(grid, 2, 2);

    expect(moveNeighboursOf(grid, middle, false)).toHaveLength(6);
    expect(moveNeighboursOf(grid, middle, true)).toHaveLength(6);
  });
});
