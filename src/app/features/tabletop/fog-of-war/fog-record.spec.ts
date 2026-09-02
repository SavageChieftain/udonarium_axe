import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, cellGridOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import { mergeFogRecord } from '@axe/features/tabletop/fog-of-war/fog-record';
import { describe, expect, it } from 'vitest';

const GRID = cellGridOf(4, 4, 50, GridType.SQUARE);

function bits(...cells: number[]): CellBits {
  const held = new CellBits(cellCount(GRID));
  for (const cell of cells) held.set(cell);
  return held;
}

describe('mergeFogRecord', () => {
  it('starts from what is in sight when nothing is held yet', () => {
    const record = mergeFogRecord(null, GRID, null, bits(1));
    expect(record.bits.get(1)).toBe(true);
    expect(record.generation).toBe(0);
  });

  it('adds what is in sight to what is already held', () => {
    const first = mergeFogRecord(null, GRID, null, bits(1));
    const second = mergeFogRecord(first, GRID, null, bits(2));
    expect(second.bits.get(1)).toBe(true);
    expect(second.bits.get(2)).toBe(true);
  });

  it('takes in what another client has written down', () => {
    const record = mergeFogRecord(null, GRID, { generation: 0, bits: bits(5), found: new Set<string>() }, bits(1));
    expect(record.bits.get(5)).toBe(true);
    expect(record.bits.get(1)).toBe(true);
  });

  it('throws its running total away once the record has been cleared', () => {
    const before = mergeFogRecord(null, GRID, { generation: 0, bits: bits(5), found: new Set<string>() }, bits(1));
    const after = mergeFogRecord(
      before,
      GRID,
      { generation: 1, bits: new CellBits(cellCount(GRID)), found: new Set<string>() },
      bits(3)
    );
    expect(after.generation).toBe(1);
    expect(after.bits.get(5)).toBe(false);
    expect(after.bits.get(1)).toBe(false);
    expect(after.bits.get(3)).toBe(true);
  });

  it('adds the pieces the party met to those it already had', () => {
    const first = mergeFogRecord(null, GRID, null, bits(1), new Set(['goblin']));
    const second = mergeFogRecord(first, GRID, null, bits(2), new Set(['orc']));
    expect([...second.found].sort()).toEqual(['goblin', 'orc']);
  });

  it('takes in the pieces another client wrote down', () => {
    const record = mergeFogRecord(
      null,
      GRID,
      { generation: 0, bits: bits(5), found: new Set(['ogre']) },
      bits(1),
      new Set(['goblin'])
    );
    expect([...record.found].sort()).toEqual(['goblin', 'ogre']);
  });

  it('forgets the pieces it met once the record has been cleared', () => {
    const before = mergeFogRecord(null, GRID, null, bits(1), new Set(['goblin']));
    const after = mergeFogRecord(
      before,
      GRID,
      { generation: 1, bits: new CellBits(cellCount(GRID)), found: new Set<string>() },
      bits(3),
      new Set(['orc'])
    );
    expect([...after.found]).toEqual(['orc']);
  });

  it('throws it away when the board is not the board it was written for', () => {
    const before = mergeFogRecord(null, GRID, null, bits(1));
    const wider = cellGridOf(8, 4, 50, GridType.SQUARE);
    const after = mergeFogRecord(before, wider, null, new CellBits(cellCount(wider)));
    expect(after.bits.isEmpty).toBe(true);
  });
});
