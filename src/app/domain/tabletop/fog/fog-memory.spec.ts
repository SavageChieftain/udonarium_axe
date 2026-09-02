import { cellGridOf } from '@axe/domain/tabletop/fog/cell-grid';
import { ensureFogMemoryOn, FogMemory, fogMemoryIdentifierOf } from '@axe/domain/tabletop/fog/fog-memory';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';

describe('FogMemory: the pieces the party has met', () => {
  it('starts out having met nobody', () => {
    expect(new FogMemory().readFound().size).toBe(0);
  });

  it('reads back what was written down', () => {
    const memory = new FogMemory();
    memory.writeFound(new Set(['goblin', 'orc']));
    expect([...memory.readFound()].sort()).toEqual(['goblin', 'orc']);
  });

  it('writes the same string for the same pieces, whatever order they arrived in', () => {
    const one = new FogMemory();
    const other = new FogMemory();
    one.writeFound(new Set(['orc', 'goblin']));
    other.writeFound(new Set(['goblin', 'orc']));
    expect(one.found).toBe(other.found);
  });

  it('forgets them along with the ground when the record is thrown away', () => {
    const memory = new FogMemory();
    memory.write(cellGridOf(4, 4, 50, GridType.SQUARE), memory.read(cellGridOf(4, 4, 50, GridType.SQUARE)));
    memory.writeFound(new Set(['goblin']));

    memory.reset();

    expect(memory.readFound().size).toBe(0);
    expect(memory.bits).toBe('');
  });
});

describe('the one record a table keeps', () => {
  function makeTable(): GameTable {
    const table = new GameTable();
    table.initialize();
    return table;
  }

  it('names the record after the table it belongs to', () => {
    const table = makeTable();
    expect(ensureFogMemoryOn(table).identifier).toBe(fogMemoryIdentifierOf(table));
    table.destroy();
  });

  it('hands the same one back rather than hanging a second on the table', () => {
    const table = makeTable();
    const first = ensureFogMemoryOn(table);

    expect(ensureFogMemoryOn(table)).toBe(first);
    expect(table.children.filter((child) => child instanceof FogMemory)).toHaveLength(1);

    table.destroy();
  });

  it('gives two tables records of their own', () => {
    const one = makeTable();
    const other = makeTable();

    expect(ensureFogMemoryOn(one).identifier).not.toBe(ensureFogMemoryOn(other).identifier);

    one.destroy();
    other.destroy();
  });
});
