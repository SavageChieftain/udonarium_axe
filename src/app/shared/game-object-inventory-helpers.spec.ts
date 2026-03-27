import { SortOrder } from '@axe/domain/data/data-summary-setting';

import { sortObjectsByTags, toSortableValue } from './game-object-inventory-helpers';

function createObject(name: string, hp: string | number, dex: string | number) {
  return {
    identifier: name,
    rootDataElement: {
      getFirstElementByName: (tag: string) => {
        if (tag === 'HP') return createElement(hp);
        if (tag === 'DEX') return createElement(dex);
        return null;
      },
    },
  };
}

function createElement(value: string | number) {
  const isNumber = typeof value === 'number';
  return {
    isNumberResource: isNumber,
    currentValue: isNumber ? value : 0,
    value: isNumber ? String(value) : value,
  };
}

describe('game-object-inventory-helpers', () => {
  describe('toSortableValue', () => {
    it('数値文字列は number に変換されること', () => {
      expect(toSortableValue(createElement('１２３') as never)).toBe(123);
    });

    it('数値でない文字列はそのまま返ること', () => {
      expect(toSortableValue(createElement('abc') as never)).toBe('abc');
    });
  });

  describe('sortObjectsByTags', () => {
    it('sortTag 未指定時は並び順を変更しないこと', () => {
      const a = createObject('a', 20, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], '', SortOrder.ASC, 'DEX', SortOrder.ASC);
      expect(result).toEqual([a, b]);
    });

    it('1次キーで昇順ソートできること', () => {
      const a = createObject('a', 20, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], 'HP', SortOrder.ASC, 'DEX', SortOrder.ASC);
      expect(result.map((x) => x.identifier)).toEqual(['b', 'a']);
    });

    it('1次キーが同値のとき2次キーで降順ソートできること', () => {
      const a = createObject('a', 10, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], 'HP', SortOrder.ASC, 'DEX', SortOrder.DESC);
      expect(result.map((x) => x.identifier)).toEqual(['b', 'a']);
    });
  });
});
