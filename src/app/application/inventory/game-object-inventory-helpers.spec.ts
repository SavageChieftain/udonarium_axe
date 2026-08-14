import { sortObjectsByTags, toSortableValue } from '@axe/application/inventory/game-object-inventory-helpers';
import { DataElement } from '@axe/domain/data/data-element';
import { SortOrder } from '@axe/domain/data/data-summary-setting';

function createObject(name: string, hp: string | number, dex: string | number) {
  const rootDataElement = DataElement.create('character', '');
  const detail = DataElement.create('detail', '');
  const resource = DataElement.create('リソース', '');
  const ability = DataElement.create('能力', '');
  rootDataElement.appendChild(detail);
  detail.appendChild(resource);
  detail.appendChild(ability);
  resource.appendChild(DataElement.create('HP', hp));
  ability.appendChild(DataElement.create('DEX', dex));

  return {
    identifier: name,
    rootDataElement,
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
    it('turns a numeric string into a number', () => {
      expect(toSortableValue(createElement('１２３') as never)).toBe(123);
    });

    it('leaves a non-numeric string alone', () => {
      expect(toSortableValue(createElement('abc') as never)).toBe('abc');
    });
  });

  describe('sortObjectsByTags', () => {
    it('leaves the order alone with no sort tag', () => {
      const a = createObject('a', 20, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], '', SortOrder.ASC, 'DEX', SortOrder.ASC);
      expect(result).toEqual([a, b]);
    });

    it('sorts ascending by the first key', () => {
      const a = createObject('a', 20, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], 'HP', SortOrder.ASC, 'DEX', SortOrder.ASC);
      expect(result.map((x) => x.identifier)).toEqual(['b', 'a']);
    });

    it('sorts descending by the second key when the first ties', () => {
      const a = createObject('a', 10, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], 'HP', SortOrder.ASC, 'DEX', SortOrder.DESC);
      expect(result.map((x) => x.identifier)).toEqual(['b', 'a']);
    });

    it('sorts by a tag named with a path', () => {
      const a = createObject('a', 20, 5);
      const b = createObject('b', 10, 8);
      const result = sortObjectsByTags([a, b] as never[], 'リソース/HP', SortOrder.ASC, '', SortOrder.ASC);
      expect(result.map((x) => x.identifier)).toEqual(['b', 'a']);
    });
  });
});
