import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementFieldType } from '@axe/domain/data/data-element';
import { collectRegisteredEffects } from '@axe/features/character/game-character/game-character-context-menu';

describe('collectRegisteredEffects()', () => {
  let character: GameCharacter;

  function appendElement(fieldType: string, name: string, currentValue: string): DataElement {
    const element = DataElement.create(name, '', { fieldType });
    element.currentValue = currentValue;
    character.appendChild(element);
    return element;
  }

  beforeEach(() => {
    character = GameCharacter.create('術者', 1, '');
  });

  afterEach(() => {
    for (const object of ObjectStore.instance.getObjects()) ObjectStore.instance.delete(object, false);
    ObjectStore.instance.clearDeleteHistory();
  });

  it('演出の欄だけを拾うこと', () => {
    appendElement(DataElementFieldType.EFFECT, '必殺技', '爆炎');
    appendElement(DataElementFieldType.TEXT, 'メモ', '斬撃');

    expect(collectRegisteredEffects(character)).toEqual(['爆炎']);
  });

  it('入れ子の欄も拾うこと', () => {
    const group = DataElement.create('技能', '', {});
    character.appendChild(group);
    const child = DataElement.create('一撃', '', { fieldType: DataElementFieldType.EFFECT });
    child.currentValue = '一閃';
    group.appendChild(child);

    expect(collectRegisteredEffects(character)).toEqual(['一閃']);
  });

  it('空欄と重複を落とすこと', () => {
    appendElement(DataElementFieldType.EFFECT, '技1', '爆炎');
    appendElement(DataElementFieldType.EFFECT, '技2', '爆炎');
    appendElement(DataElementFieldType.EFFECT, '技3', '  ');

    expect(collectRegisteredEffects(character)).toEqual(['爆炎']);
  });
});
