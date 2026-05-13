import { TestBed } from '@angular/core/testing';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementAttribute, DataElementRole } from '@axe/domain/data/data-element';
import {
  canReorderDetailElement,
  reorderDetailElement,
} from '@axe/features/character/game-character-sheet/detail-element-reorder-helpers';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';

function appendSection(character: GameCharacter, name: string): DataElement {
  const detail = character.detailDataElement!;
  const section = DataElement.create(name, '', {
    [DataElementAttribute.ROLE]: DataElementRole.SECTION,
  });
  detail.appendChild(section);
  return section;
}

describe('canReorderDetailElement', () => {
  let objectStore: ObjectStore;
  let character: GameCharacter;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    objectStore = TestBed.inject(ObjectStore);
    character = GameCharacter.create('reorder-test', 1, '');
  });

  afterEach(() => {
    character.destroy();
  });

  it('character が null なら false', () => {
    expect(canReorderDetailElement(null, objectStore, 'a', 'b')).toBe(false);
  });

  it('同じ id へのドロップは false', () => {
    const section = appendSection(character, 'A');
    expect(canReorderDetailElement(character, objectStore, section.identifier, section.identifier)).toBe(false);
  });

  it('detail 直下の section 同士の並び替えは true', () => {
    const a = appendSection(character, 'A');
    const b = appendSection(character, 'B');
    expect(canReorderDetailElement(character, objectStore, a.identifier, b.identifier)).toBe(true);
  });

  it('ObjectStore に存在しない id は false', () => {
    const target = appendSection(character, 'A');
    expect(canReorderDetailElement(character, objectStore, 'nonexistent', target.identifier)).toBe(false);
  });

  it('detail を子孫に含む要素は (循環防止のため) 並び替え不可', () => {
    appendSection(character, 'A'); // 別 section が target になれるよう用意
    const targetSection = appendSection(character, 'B');
    // detail を持つ祖先 (root) を draggedId に与えると detail を内包するので false
    const root = character.rootDataElement!;
    expect(canReorderDetailElement(character, objectStore, root.identifier, targetSection.identifier)).toBe(false);
  });
});

describe('reorderDetailElement', () => {
  let objectStore: ObjectStore;
  let objectChange: ObjectChangeService;
  let character: GameCharacter;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    objectStore = TestBed.inject(ObjectStore);
    objectChange = TestBed.inject(ObjectChangeService);
    character = GameCharacter.create('reorder-exec-test', 1, '');
  });

  afterEach(() => {
    character.destroy();
  });

  it('dragged を target の直前に移動する', () => {
    const a = appendSection(character, 'reorder-A');
    const b = appendSection(character, 'reorder-B');
    const c = appendSection(character, 'reorder-C');
    const tracked = new Set([a.identifier, b.identifier, c.identifier]);

    reorderDetailElement(character, objectStore, objectChange, c.identifier, a.identifier);

    const order = character.detailDataElement!.children.map((e) => e.identifier).filter((id) => tracked.has(id));
    expect(order).toEqual([c.identifier, a.identifier, b.identifier]);
  });

  it('character が null なら何もしない (例外も出さない)', () => {
    expect(() => reorderDetailElement(null, objectStore, objectChange, 'x', 'y')).not.toThrow();
  });

  it('ObjectStore に無い dragged id では何もしない', () => {
    const a = appendSection(character, 'A');
    const beforeOrder = character.detailDataElement!.children.map((e) => e.identifier);

    reorderDetailElement(character, objectStore, objectChange, 'unknown', a.identifier);

    expect(character.detailDataElement!.children.map((e) => e.identifier)).toEqual(beforeOrder);
  });

  it('detail および移動した要素の version signal を bump する', () => {
    const a = appendSection(character, 'A');
    const b = appendSection(character, 'B');

    const draggedBefore = objectChange.versionOf(b.identifier)();
    const detailBefore = objectChange.versionOf(character.detailDataElement!.identifier)();

    reorderDetailElement(character, objectStore, objectChange, b.identifier, a.identifier);

    expect(objectChange.versionOf(b.identifier)()).toBeGreaterThan(draggedBefore);
    expect(objectChange.versionOf(character.detailDataElement!.identifier)()).toBeGreaterThan(detailBefore);
  });
});
