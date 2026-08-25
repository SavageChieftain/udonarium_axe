import { matchesSearchText } from '@axe/core/util/text-search';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildInventoryRow,
  filterInventoryRows,
  filterInventoryRowsByHidden,
  type InventoryRow,
  inventorySearchText,
} from '@axe/features/inventory/game-object-inventory/inventory-list';

let counter = 0;

function makeRow(name = 'ゴブリン', folderName = ''): InventoryRow {
  counter += 1;
  return buildInventoryRow({ identifier: `object-${counter}`, name } as TabletopObject, folderName);
}

function textOf(row: InventoryRow, ownerName = '', elementTexts: readonly string[] = []): string {
  return inventorySearchText(row, ownerName, elementTexts);
}

describe('buildInventoryRow()', () => {
  it('takes its identifier from the object', () => {
    const object = { identifier: 'abc', name: 'ゴブリン' } as TabletopObject;

    expect(buildInventoryRow(object, '').identifier).toBe('abc');
  });

  it('normalizes the folder it was given', () => {
    expect(makeRow('ゴブリン', ' 第1話 // 洞窟 ').folderPath).toBe('第1話/洞窟');
  });
});

describe('inventorySearchText()', () => {
  it('gathers the name, the owner and the folder', () => {
    const text = textOf(makeRow('ゴブリン', '第1話'), '田中');

    expect(matchesSearchText(text, ['ゴブリン'])).toBe(true);
    expect(matchesSearchText(text, ['田中'])).toBe(true);
    expect(matchesSearchText(text, ['第1話'])).toBe(true);
  });

  it('gathers the values it is handed', () => {
    expect(matchesSearchText(textOf(makeRow(), '', ['毒']), ['毒'])).toBe(true);
  });

  it('holds only the name and the owner when it is handed no values', () => {
    expect(textOf(makeRow('ゴブリン'), '田中')).toBe('ゴブリン 田中');
  });
});

describe('filterInventoryRows()', () => {
  it('keeps every row when nothing is searched for', () => {
    const rows = [makeRow('ゴブリン'), makeRow('村長')];

    expect(filterInventoryRows(rows, [], (row) => textOf(row))).toHaveLength(2);
  });

  it('never asks for the text of a row when nothing is searched for', () => {
    const searchTextOf = vi.fn((row: InventoryRow) => textOf(row));

    filterInventoryRows([makeRow(), makeRow()], [], searchTextOf);

    expect(searchTextOf).not.toHaveBeenCalled();
  });

  it('keeps only what matches', () => {
    const rows = [makeRow('ゴブリン'), makeRow('村長')];

    expect(filterInventoryRows(rows, ['村長'], (row) => textOf(row)).map((row) => row.object.name)).toEqual(['村長']);
  });

  it('hands back a list of its own rather than the one it was given', () => {
    const rows = [makeRow()];

    expect(filterInventoryRows(rows, [], (row) => textOf(row))).not.toBe(rows);
  });
});

describe('filterInventoryRowsByHidden()', () => {
  const shown = makeRow('村長');
  const hidden = makeRow('伏せた敵');
  const rows = [shown, hidden];
  const isHidden = (row: InventoryRow) => row === hidden;

  it('keeps every row when nothing is filtered out', () => {
    expect(filterInventoryRowsByHidden(rows, 'all', isHidden)).toHaveLength(2);
  });

  it('hands back a list of its own rather than the one it was given', () => {
    expect(filterInventoryRowsByHidden(rows, 'all', isHidden)).not.toBe(rows);
  });

  it('keeps only what the inventory hides', () => {
    expect(filterInventoryRowsByHidden(rows, 'only', isHidden)).toEqual([hidden]);
  });

  it('drops what the inventory hides', () => {
    expect(filterInventoryRowsByHidden(rows, 'exclude', isHidden)).toEqual([shown]);
  });
});
