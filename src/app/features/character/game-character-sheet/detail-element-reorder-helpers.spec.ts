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

  it('is false without a character', () => {
    expect(canReorderDetailElement(null, objectStore, 'a', 'b')).toBe(false);
  });

  it('is false for a drop onto itself', () => {
    const section = appendSection(character, 'A');
    expect(canReorderDetailElement(character, objectStore, section.identifier, section.identifier)).toBe(false);
  });

  it('is true between two sections of the same sheet', () => {
    const a = appendSection(character, 'A');
    const b = appendSection(character, 'B');
    expect(canReorderDetailElement(character, objectStore, a.identifier, b.identifier)).toBe(true);
  });

  it('is false for an identifier the store does not know', () => {
    const target = appendSection(character, 'A');
    expect(canReorderDetailElement(character, objectStore, 'nonexistent', target.identifier)).toBe(false);
  });

  it('refuses to move an element that contains the sheet, which would make a loop', () => {
    appendSection(character, 'A'); // 別 section が target になれるよう用意
    const targetSection = appendSection(character, 'B');
    // is false for the root, which contains it
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

  it('moves what was dragged in front of the target', () => {
    const a = appendSection(character, 'reorder-A');
    const b = appendSection(character, 'reorder-B');
    const c = appendSection(character, 'reorder-C');
    const tracked = new Set([a.identifier, b.identifier, c.identifier]);

    reorderDetailElement(character, objectStore, objectChange, c.identifier, a.identifier);

    const order = character.detailDataElement!.children.map((e) => e.identifier).filter((id) => tracked.has(id));
    expect(order).toEqual([c.identifier, a.identifier, b.identifier]);
  });

  it('does nothing, and throws nothing, without a character', () => {
    expect(() => reorderDetailElement(null, objectStore, objectChange, 'x', 'y')).not.toThrow();
  });

  it('does nothing for an identifier the store does not know', () => {
    const a = appendSection(character, 'A');
    const beforeOrder = character.detailDataElement!.children.map((e) => e.identifier);

    reorderDetailElement(character, objectStore, objectChange, 'unknown', a.identifier);

    expect(character.detailDataElement!.children.map((e) => e.identifier)).toEqual(beforeOrder);
  });

  it('bumps the version of the sheet and of what moved', () => {
    const a = appendSection(character, 'A');
    const b = appendSection(character, 'B');

    const draggedBefore = objectChange.versionOf(b.identifier)();
    const detailBefore = objectChange.versionOf(character.detailDataElement!.identifier)();

    reorderDetailElement(character, objectStore, objectChange, b.identifier, a.identifier);

    expect(objectChange.versionOf(b.identifier)()).toBeGreaterThan(draggedBefore);
    expect(objectChange.versionOf(character.detailDataElement!.identifier)()).toBeGreaterThan(detailBefore);
  });
});
