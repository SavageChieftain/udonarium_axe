import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import {
  buildInventoryRow,
  filterInventoryRows,
  type InventoryRowSource,
  matchesInventoryRow,
  normalizeInventoryText,
  splitSearchTerms,
} from '@axe/features/inventory/game-object-inventory/inventory-list';

let counter = 0;

function makeSource(overrides: Partial<InventoryRowSource> & { name?: string } = {}): InventoryRowSource {
  counter += 1;
  return {
    object: { identifier: `object-${counter}`, name: overrides.name ?? 'ゴブリン' } as TabletopObject,
    folderName: overrides.folderName ?? '',
    ownerName: overrides.ownerName ?? '',
    elementTexts: overrides.elementTexts ?? [],
  };
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
    const source = makeSource();
    expect(buildInventoryRow(source).identifier).toBe(source.object.identifier);
  });

  it('normalizes the folder it was given', () => {
    expect(buildInventoryRow(makeSource({ folderName: ' 第1話 // 洞窟 ' })).folderPath).toBe('第1話/洞窟');
  });

  it('searches over the name, the owner and the folder', () => {
    const row = buildInventoryRow(makeSource({ name: 'ゴブリン', ownerName: '田中', folderName: '第1話' }));
    expect(matchesInventoryRow(row, ['ゴブリン'])).toBe(true);
    expect(matchesInventoryRow(row, ['田中'])).toBe(true);
    expect(matchesInventoryRow(row, ['第1話'])).toBe(true);
  });

  it('searches over the values on show', () => {
    const row = buildInventoryRow(makeSource({ elementTexts: ['毒'] }));
    expect(matchesInventoryRow(row, ['毒'])).toBe(true);
  });

  it('leaves the values out when it is given none', () => {
    const row = buildInventoryRow(makeSource({ name: 'ゴブリン', ownerName: '田中' }));
    expect(row.searchText).toBe('ゴブリン 田中');
  });
});

describe('matchesInventoryRow()', () => {
  it('lets everything through for an empty search', () => {
    expect(matchesInventoryRow(buildInventoryRow(makeSource()), [])).toBe(true);
  });

  it('finds a name by part of it', () => {
    expect(matchesInventoryRow(buildInventoryRow(makeSource({ name: 'ゴブリン戦士' })), ['ブリン'])).toBe(true);
  });

  it('wants every word of the search, not just one', () => {
    const row = buildInventoryRow(makeSource({ name: 'ゴブリン戦士' }));
    expect(matchesInventoryRow(row, ['ゴブリン', '戦士'])).toBe(true);
    expect(matchesInventoryRow(row, ['ゴブリン', '魔術師'])).toBe(false);
  });

  it('finds a full-width name typed in half-width', () => {
    expect(matchesInventoryRow(buildInventoryRow(makeSource({ name: 'ＨＰポーション' })), ['hp'])).toBe(true);
  });
});

describe('filterInventoryRows()', () => {
  it('keeps every row when nothing is searched for', () => {
    const rows = [buildInventoryRow(makeSource({ name: 'ゴブリン' })), buildInventoryRow(makeSource({ name: '村長' }))];
    expect(filterInventoryRows(rows, [])).toHaveLength(2);
  });

  it('keeps only what matches', () => {
    const rows = [buildInventoryRow(makeSource({ name: 'ゴブリン' })), buildInventoryRow(makeSource({ name: '村長' }))];
    expect(filterInventoryRows(rows, ['村長']).map((row) => row.object.name)).toEqual(['村長']);
  });

  it('hands back a list of its own rather than the one it was given', () => {
    const rows = [buildInventoryRow(makeSource())];
    expect(filterInventoryRows(rows, [])).not.toBe(rows);
  });
});
