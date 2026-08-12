import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement, DataElementAttribute, DataElementRole } from '@axe/domain/data/data-element';
import {
  createContainerElement,
  createFieldElement,
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

describe('項目の組み替え', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  describe('moveStructureElement()', () => {
    it('入れ物の中へ入れること', () => {
      const from = group('元');
      const into = group('先');
      const item = field('HP');
      from.appendChild(item);

      const moved = moveStructureElement(item, into, 'inside');

      expect(moved).toEqual({ newParent: into, oldParent: from });
      expect(childNames(into)).toEqual(['HP']);
      expect(childNames(from)).toEqual([]);
    });

    it('兄弟の前へ入れること', () => {
      const parent = group('親');
      const first = field('HP');
      const second = field('MP');
      parent.appendChild(first);
      parent.appendChild(second);

      moveStructureElement(second, first, 'before');

      expect(childNames(parent)).toEqual(['MP', 'HP']);
    });

    it('兄弟の後ろへ入れること', () => {
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

    it('親を持たない相手の隣へは動かさないこと', () => {
      const orphan = group('親なし');
      const item = field('HP');
      group('元').appendChild(item);

      expect(moveStructureElement(item, orphan, 'before')).toBeNull();
    });
  });

  describe('insertElementAfter()', () => {
    it('末尾の後ろなら、末尾に足すこと', () => {
      const parent = group('親');
      const last = field('HP');
      parent.appendChild(last);

      insertElementAfter(field('MP'), last, parent);

      expect(childNames(parent)).toEqual(['HP', 'MP']);
    });
  });

  describe('createFieldElement()', () => {
    it('兄弟と名前が重ならないようにすること', () => {
      const parent = group('親');
      parent.appendChild(field('新規タグ'));

      const created = createFieldElement(parent, NAMES);

      expect(created.name).not.toBe('新規タグ');
      expect(created.getAttribute(DataElementAttribute.ROLE)).toBe(DataElementRole.FIELD);
    });

    it('続けて作っても名前が重ならないこと', () => {
      const parent = group('親');
      const reserved = new Set<string>();

      const first = createFieldElement(parent, NAMES, reserved);
      const second = createFieldElement(parent, NAMES, reserved);

      expect(first.name).not.toBe(second.name);
    });
  });

  describe('createContainerElement()', () => {
    it('中身を 1 つ入れた状態で作ること', () => {
      const parent = group('親');

      const created = createContainerElement(DataElementRole.GROUP, parent, NAMES);

      expect(created.getAttribute(DataElementAttribute.ROLE)).toBe(DataElementRole.GROUP);
      expect(created.children).toHaveLength(1);
    });

    it('節を作ると、中に組が 1 つ入ること', () => {
      const parent = group('親');

      const created = createContainerElement(DataElementRole.SECTION, parent, NAMES);
      const inner = created.children[0] as DataElement;

      expect(inner.getAttribute(DataElementAttribute.ROLE)).toBe(DataElementRole.GROUP);
      expect(inner.children).toHaveLength(1);
    });
  });
});
