import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, cellGridOf, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { ensureMoveBlockMapOn, MoveBlockMap, moveBlockMapIdentifierOf } from '@axe/domain/tabletop/move/move-block-map';
import { describe, expect, it } from 'vitest';

const small = cellGridOf(10, 10, 50, GridType.SQUARE);

function painted(grid = small, cells: number[] = [cellIndexOf(grid, 3, 4)]): CellBits {
  const bits = new CellBits(cellCount(grid));
  for (const cell of cells) bits.set(cell);
  return bits;
}

function makeTable(): GameTable {
  const table = new GameTable();
  table.initialize();
  return table;
}

describe('the cells a game master has painted as no-go', () => {
  it('reads back what was painted', () => {
    const map = new MoveBlockMap();
    map.write(small, painted());

    expect(map.read(small).get(cellIndexOf(small, 3, 4))).toBe(true);
    expect(map.read(small).get(cellIndexOf(small, 0, 0))).toBe(false);
  });

  it('starts empty and says so', () => {
    expect(new MoveBlockMap().isEmpty).toBe(true);
    expect(new MoveBlockMap().read(small).isEmpty).toBe(true);
  });

  it('is thrown away when the grid under it changes', () => {
    const map = new MoveBlockMap();
    map.write(small, painted());
    const wider = cellGridOf(12, 10, 50, GridType.SQUARE);

    expect(map.matches(wider)).toBe(false);
    expect(map.read(wider).isEmpty).toBe(true);
  });

  it('is thrown away when the cells change shape', () => {
    const map = new MoveBlockMap();
    map.write(small, painted());
    const hex = cellGridOf(10, 10, 50, GridType.HEX_VERTICAL);

    expect(map.read(hex).isEmpty).toBe(true);
  });

  it('takes the new grid the next time it is painted on', () => {
    const map = new MoveBlockMap();
    map.write(small, painted());
    const wider = cellGridOf(12, 10, 50, GridType.SQUARE);

    map.write(wider, painted(wider, [cellIndexOf(wider, 11, 9)]));

    expect(map.cols).toBe(12);
    expect(map.read(wider).get(cellIndexOf(wider, 11, 9))).toBe(true);
  });

  it('is wiped clean', () => {
    const map = new MoveBlockMap();
    map.write(small, painted());

    map.reset();

    expect(map.read(small).isEmpty).toBe(true);
  });
});

describe('the one no-go map a table keeps', () => {
  it('names it after the table it belongs to', () => {
    const table = makeTable();
    expect(ensureMoveBlockMapOn(table).identifier).toBe(moveBlockMapIdentifierOf(table));
    table.destroy();
  });

  it('hands the same one back rather than hanging a second on the table', () => {
    const table = makeTable();
    const first = ensureMoveBlockMapOn(table);

    expect(ensureMoveBlockMapOn(table)).toBe(first);
    expect(table.children.filter((child) => child instanceof MoveBlockMap)).toHaveLength(1);

    table.destroy();
  });
});
