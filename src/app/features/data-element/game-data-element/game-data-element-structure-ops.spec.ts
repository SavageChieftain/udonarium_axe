import { TestBed } from '@angular/core/testing';
import { DataElement, DataElementAttribute, DataElementRole } from '@axe/domain/data/data-element';
import {
  createFieldElement,
  createGroupElement,
  insertElementAfter,
  moveStructureElement,
  type NewElementNames,
} from '@axe/features/data-element/game-data-element/game-data-element-structure-ops';

const NAMES: NewElementNames = { field: '新規タグ', group: '新規グループ' };

function group(name: string): DataElement {
  return DataElement.create(name, '', { [DataElementAttribute.ROLE]: DataElementRole.GROUP });
}

function field(name: string): DataElement {
  return DataElement.create(name, '', { [DataElementAttribute.ROLE]: DataElementRole.FIELD });
}

function childNames(element: DataElement): string[] {
  return element.children.map((child) => (child as DataElement).name);
}

describe('rearranging the items', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  describe('moveStructureElement()', () => {
    it('moves an item into a container', () => {
      const from = group('元');
      const into = group('先');
      const item = field('HP');
      from.appendChild(item);

      const moved = moveStructureElement(item, into, 'inside');

      expect(moved).toEqual({ newParent: into, oldParent: from });
      expect(childNames(into)).toEqual(['HP']);
      expect(childNames(from)).toEqual([]);
    });

    it('moves it in front of a sibling', () => {
      const parent = group('親');
      const first = field('HP');
      const second = field('MP');
      parent.appendChild(first);
      parent.appendChild(second);

      moveStructureElement(second, first, 'before');

      expect(childNames(parent)).toEqual(['MP', 'HP']);
    });

    it('moves it behind one', () => {
      const parent = group('親');
      const first = field('HP');
      const second = field('MP');
      const third = field('SAN');
      parent.appendChild(first);
      parent.appendChild(second);
      parent.appendChild(third);

      moveStructureElement(first, second, 'after');

      expect(childNames(parent)).toEqual(['MP', 'HP', 'SAN']);
    });

    it('does not move it beside something with no parent', () => {
      const orphan = group('親なし');
      const item = field('HP');
      group('元').appendChild(item);

      expect(moveStructureElement(item, orphan, 'before')).toBeNull();
    });
  });

  describe('insertElementAfter()', () => {
    it('adds it at the end when it goes behind the last', () => {
      const parent = group('親');
      const last = field('HP');
      parent.appendChild(last);

      insertElementAfter(field('MP'), last, parent);

      expect(childNames(parent)).toEqual(['HP', 'MP']);
    });
  });

  describe('createFieldElement()', () => {
    it('gives it a name no sibling has', () => {
      const parent = group('親');
      parent.appendChild(field('新規タグ'));

      const created = createFieldElement(parent, NAMES);

      expect(created.name).not.toBe('新規タグ');
      expect(created.getAttribute(DataElementAttribute.ROLE)).toBe(DataElementRole.FIELD);
    });

    it('keeps giving distinct names one after another', () => {
      const parent = group('親');
      const reserved = new Set<string>();

      const first = createFieldElement(parent, NAMES, reserved);
      const second = createFieldElement(parent, NAMES, reserved);

      expect(first.name).not.toBe(second.name);
    });
  });

  describe('createGroupElement()', () => {
    it('makes it with one thing already inside', () => {
      const parent = group('親');

      const created = createGroupElement(parent, NAMES);

      expect(created.getAttribute(DataElementAttribute.ROLE)).toBe(DataElementRole.GROUP);
      expect(created.children).toHaveLength(1);
      expect((created.children[0] as DataElement).getAttribute(DataElementAttribute.ROLE)).toBe(DataElementRole.FIELD);
    });

    it('gives a group a name no sibling has either', () => {
      const parent = group('親');
      parent.appendChild(group('新規グループ'));

      expect(createGroupElement(parent, NAMES).name).not.toBe('新規グループ');
    });
  });
});
