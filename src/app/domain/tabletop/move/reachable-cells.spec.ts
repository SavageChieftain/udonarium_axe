import { cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import { countCells, reachableCells } from '@axe/domain/tabletop/move/reachable-cells';
import { describe, expect, it } from 'vitest';

const nothingBlocked = () => false;

describe('the cells a piece can walk to', () => {
  it('reaches the eight around it in one step on a board of squares', () => {
    const grid = cellGridOf(10, 10, 50, GridType.SQUARE);
    const reached = reachableCells(grid, cellIndexOf(grid, 5, 5), 1, nothingBlocked);
    expect(countCells(reached)).toBe(8);
  });

  it('reaches the six around it in one step on a board of hexes', () => {
    for (const type of [GridType.HEX_VERTICAL, GridType.HEX_HORIZONTAL]) {
      const grid = cellGridOf(10, 10, 50, type);
      const reached = reachableCells(grid, cellIndexOf(grid, 5, 5), 1, nothingBlocked);
      expect(countCells(reached)).toBe(6);
    }
  });

  it('leaves out the cell it started from', () => {
    const grid = cellGridOf(10, 10, 50, GridType.SQUARE);
    const start = cellIndexOf(grid, 5, 5);
    expect(reachableCells(grid, start, 3, nothingBlocked).get(start)).toBe(false);
  });

  it('reaches nowhere with nothing to spend', () => {
    const grid = cellGridOf(10, 10, 50, GridType.SQUARE);
    expect(countCells(reachableCells(grid, cellIndexOf(grid, 5, 5), 0, nothingBlocked))).toBe(0);
  });

  it('reaches nowhere from off the board', () => {
    const grid = cellGridOf(10, 10, 50, GridType.SQUARE);
    expect(countCells(reachableCells(grid, -1, 3, nothingBlocked))).toBe(0);
  });
});

describe('the cells a piece can walk to past a wall', () => {
  const grid = cellGridOf(5, 5, 50, GridType.SQUARE);
  const wall = new Set([
    cellIndexOf(grid, 2, 0),
    cellIndexOf(grid, 2, 1),
    cellIndexOf(grid, 2, 2),
    cellIndexOf(grid, 2, 3),
  ]);
  const blocked = (index: number) => wall.has(index);
  const start = cellIndexOf(grid, 0, 0);

  it('never stands in the wall itself', () => {
    const reached = reachableCells(grid, start, 8, blocked);
    for (const cell of wall) expect(reached.get(cell)).toBe(false);
  });

  it('does not step through it, however near the far side is', () => {
    const reached = reachableCells(grid, start, 3, blocked);
    expect(reached.get(cellIndexOf(grid, 1, 3))).toBe(true);
    expect(reached.get(cellIndexOf(grid, 3, 0))).toBe(false);
  });

  it('comes round the end of it when there is walking enough', () => {
    expect(reachableCells(grid, start, 8, blocked).get(cellIndexOf(grid, 3, 0))).toBe(true);
  });
});

describe('the cells a piece can walk to down a dead end', () => {
  it('stops at the end of the passage however far it could have walked', () => {
    const grid = cellGridOf(5, 5, 50, GridType.SQUARE);
    const open = new Set([
      cellIndexOf(grid, 0, 0),
      cellIndexOf(grid, 1, 0),
      cellIndexOf(grid, 2, 0),
      cellIndexOf(grid, 3, 0),
    ]);
    const reached = reachableCells(grid, cellIndexOf(grid, 0, 0), 20, (index) => !open.has(index));
    expect(countCells(reached)).toBe(3);
    expect(reached.get(cellIndexOf(grid, 4, 0))).toBe(false);
  });
});

describe('the guard on a board too big to walk in one pass', () => {
  it('gives back what it had when the budget runs out', () => {
    const grid = cellGridOf(40, 40, 50, GridType.SQUARE);
    const reached = reachableCells(grid, cellIndexOf(grid, 20, 20), 100, nothingBlocked, 50);
    expect(countCells(reached)).toBe(50);
  });

  it('walks the whole way when the budget is not in the way', () => {
    const grid = cellGridOf(40, 40, 50, GridType.SQUARE);
    const reached = reachableCells(grid, cellIndexOf(grid, 20, 20), 2, nothingBlocked, 4000);
    expect(countCells(reached)).toBe(24);
  });
});
