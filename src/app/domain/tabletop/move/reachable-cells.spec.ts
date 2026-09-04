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
    const reached = reachableCells(grid, cellIndexOf(grid, 20, 20), 100, nothingBlocked, { budget: 50 });
    expect(countCells(reached)).toBe(50);
  });

  it('walks the whole way when the budget is not in the way', () => {
    const grid = cellGridOf(40, 40, 50, GridType.SQUARE);
    const reached = reachableCells(grid, cellIndexOf(grid, 20, 20), 2, nothingBlocked, { budget: 4000 });
    expect(countCells(reached)).toBe(24);
  });
});

describe('cutting corners', () => {
  const grid = cellGridOf(9, 9, 50, GridType.SQUARE);
  const start = cellIndexOf(grid, 4, 4);
  const nothingBlocks = () => false;

  it('reaches a square of ground where a corner may be cut', () => {
    const reached = reachableCells(grid, start, 2, nothingBlocks, { cutsCorners: true });

    expect(countCells(reached)).toBe(24);
    expect(reached.get(cellIndexOf(grid, 6, 6))).toBe(true);
  });

  it('reaches a diamond where it may not', () => {
    const reached = reachableCells(grid, start, 2, nothingBlocks, { cutsCorners: false });

    // Two steps along the sides: the corners of the square are three steps away.
    expect(countCells(reached)).toBe(12);
    expect(reached.get(cellIndexOf(grid, 6, 6))).toBe(false);
    expect(reached.get(cellIndexOf(grid, 5, 5))).toBe(true);
  });
});

describe('the cells a piece can walk to over ground of its own price', () => {
  const corridor = cellGridOf(9, 1, 50, GridType.SQUARE);
  const start = cellIndexOf(corridor, 0, 0);

  it('gets no further for the steps a heavy cell takes', () => {
    const heavy = cellIndexOf(corridor, 2, 0);
    const reached = reachableCells(corridor, start, 4, nothingBlocked, {
      costOf: (index) => (index === heavy ? 2 : 1),
    });

    expect(countCells(reached)).toBe(3);
    expect(reached.get(cellIndexOf(corridor, 3, 0))).toBe(true);
    expect(reached.get(cellIndexOf(corridor, 4, 0))).toBe(false);
  });

  it('walks as far as ever where every cell costs one', () => {
    const reached = reachableCells(corridor, start, 4, nothingBlocked, { costOf: () => 1 });

    expect(countCells(reached)).toBe(4);
  });

  it('never enters a cell that costs everything', () => {
    const shut = cellIndexOf(corridor, 2, 0);
    const reached = reachableCells(corridor, start, 8, nothingBlocked, {
      costOf: (index) => (index === shut ? Infinity : 1),
    });

    expect(countCells(reached)).toBe(1);
    expect(reached.get(shut)).toBe(false);
  });

  it('answers as a wall does for ground nobody may enter', () => {
    const shut = cellIndexOf(corridor, 2, 0);
    const priced = reachableCells(corridor, start, 8, nothingBlocked, {
      costOf: (index) => (index === shut ? Infinity : 1),
    });
    const walled = reachableCells(corridor, start, 8, (index) => index === shut);

    expect(priced.equals(walled)).toBe(true);
  });

  it('goes round heavy ground rather than paying for it', () => {
    const grid = cellGridOf(5, 5, 50, GridType.SQUARE);
    const heavy = cellIndexOf(grid, 1, 2);
    const reached = reachableCells(grid, cellIndexOf(grid, 0, 2), 4, nothingBlocked, {
      cutsCorners: false,
      costOf: (index) => (index === heavy ? 5 : 1),
    });

    expect(reached.get(heavy)).toBe(false);
    expect(reached.get(cellIndexOf(grid, 2, 2))).toBe(true);
  });

  it('gives back what it had when the budget runs out on heavy ground', () => {
    const grid = cellGridOf(40, 40, 50, GridType.SQUARE);
    const reached = reachableCells(grid, cellIndexOf(grid, 20, 20), 100, nothingBlocked, {
      budget: 50,
      costOf: () => 2,
    });

    expect(countCells(reached)).toBe(50);
  });
});

describe('the cells a piece can walk to across ground that holds it', () => {
  const corridor = cellGridOf(9, 1, 50, GridType.SQUARE);
  const start = cellIndexOf(corridor, 0, 0);

  it('goes no further than the cell the walk ends in', () => {
    const holds = cellIndexOf(corridor, 2, 0);
    const reached = reachableCells(corridor, start, 6, nothingBlocked, { stopsAt: (index) => index === holds });

    expect(reached.get(holds)).toBe(true);
    expect(countCells(reached)).toBe(2);
    expect(reached.get(cellIndexOf(corridor, 3, 0))).toBe(false);
  });

  it('takes the long way round to the ground beyond, where there is walking enough for it', () => {
    const grid = cellGridOf(5, 5, 50, GridType.SQUARE);
    const holds = cellIndexOf(grid, 1, 2);
    const beyond = cellIndexOf(grid, 2, 2);
    const away = cellIndexOf(grid, 0, 2);
    const held = { cutsCorners: false, stopsAt: (index: number) => index === holds };

    expect(reachableCells(grid, away, 3, nothingBlocked, held).get(beyond)).toBe(false);
    expect(reachableCells(grid, away, 4, nothingBlocked, held).get(beyond)).toBe(true);
  });

  it('holds a piece nowhere when nothing holds it', () => {
    const reached = reachableCells(corridor, start, 4, nothingBlocked, { stopsAt: () => false });

    expect(countCells(reached)).toBe(4);
  });
});
