import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildInventoryRow,
  filterInventoryRows,
  type InventoryRow,
  inventorySearchText,
  matchesSearchText,
  normalizeInventoryText,
  splitSearchTerms,
} from '@axe/features/inventory/game-object-inventory/inventory-list';

let counter = 0;

function makeRow(name = 'ゴブリン', folderName = ''): InventoryRow {
  counter += 1;
  return buildInventoryRow({ identifier: `object-${counter}`, name } as TabletopObject, folderName);
}

function textOf(row: InventoryRow, ownerName = '', elementTexts: readonly string[] = []): string {
  return inventorySearchText(row, ownerName, elementTexts);
}

describe('normalizeInventoryText()', () => {
  it('brings full-width letters down to half-width', () => {
    expect(normalizeInventoryText('ＡＢＣ')).toBe('abc');
  });

  it('pays no attention to case', () => {
    expect(normalizeInventoryText('GoBLin')).toBe('goblin');
  });

  it('drops the spaces at either end', () => {
    expect(normalizeInventoryText('  ゴブリン  ')).toBe('ゴブリン');
  });
});

describe('splitSearchTerms()', () => {
  it('finds nothing in an empty search', () => {
    expect(splitSearchTerms('   ')).toEqual([]);
  });

  it('takes one word as one term', () => {
    expect(splitSearchTerms('ゴブリン')).toEqual(['ゴブリン']);
  });

  it('takes words apart at a space', () => {
    expect(splitSearchTerms('ゴブリン 戦士')).toEqual(['ゴブリン', '戦士']);
  });

  it('takes them apart at a full-width space too', () => {
    expect(splitSearchTerms('ゴブリン　戦士')).toEqual(['ゴブリン', '戦士']);
  });
});

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

describe('matchesSearchText()', () => {
  it('lets everything through for an empty search', () => {
    expect(matchesSearchText(textOf(makeRow()), [])).toBe(true);
  });

  it('finds a name by part of it', () => {
    expect(matchesSearchText(textOf(makeRow('ゴブリン戦士')), ['ブリン'])).toBe(true);
  });

  it('wants every word of the search, not just one', () => {
    const text = textOf(makeRow('ゴブリン戦士'));

    expect(matchesSearchText(text, ['ゴブリン', '戦士'])).toBe(true);
    expect(matchesSearchText(text, ['ゴブリン', '魔術師'])).toBe(false);
  });

  it('finds a full-width name typed in half-width', () => {
    expect(matchesSearchText(textOf(makeRow('ＨＰポーション')), ['hp'])).toBe(true);
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
