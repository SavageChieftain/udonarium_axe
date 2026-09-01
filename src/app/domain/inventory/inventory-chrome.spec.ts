import {
  formatHiddenChromeParts,
  INVENTORY_CHROME_LABEL_KEYS,
  INVENTORY_CHROME_PARTS,
  parseHiddenChromeParts,
} from '@axe/domain/inventory/inventory-chrome';

describe('the strips above the inventory list', () => {
  it('names each one', () => {
    expect(INVENTORY_CHROME_PARTS).toEqual(['tabs', 'filter', 'round']);
    for (const part of INVENTORY_CHROME_PARTS) expect(INVENTORY_CHROME_LABEL_KEYS[part]).toBeTruthy();
  });

  it('reads back what it wrote down', () => {
    expect(parseHiddenChromeParts(formatHiddenChromeParts(['tabs', 'round']))).toEqual(['tabs', 'round']);
  });

  it('passes over a strip it has never heard of', () => {
    expect(parseHiddenChromeParts('tabs,banner,round')).toEqual(['tabs', 'round']);
  });

  it('reads nothing out of nothing', () => {
    expect(parseHiddenChromeParts('')).toEqual([]);
    expect(parseHiddenChromeParts(null)).toEqual([]);
  });
});
