import { GameCharacter } from '@axe/domain/character/game-character';
import {
  DataElement,
  DataElementAttribute,
  DataElementFieldType,
  DataElementType,
} from '@axe/domain/data/data-element';
import {
  resourceElementsOf,
  resourceMax,
  resourceRatio,
} from '@axe/features/pl-tools/owned-character-list/character-resources';
import { afterEach, describe, expect, it } from 'vitest';

function addResource(character: GameCharacter, name: string, max: number, current: number): DataElement {
  const element = DataElement.create(name, max, {
    [DataElementAttribute.FIELD_TYPE]: DataElementFieldType.RESOURCE,
    type: DataElementType.NUMBER_RESOURCE,
    currentValue: current,
  });
  character.detailDataElement!.appendChild(element);
  return element;
}

describe('character-resources', () => {
  afterEach(() => {});

  it('picks up the two usual resources of the default sheet', () => {
    const character = GameCharacter.create('テスト', 1, '');
    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP']);
  });

  it('leaves out the internal fields for the picture and the portrait place', () => {
    const character = GameCharacter.create('テスト', 1, '');
    character.addExtendData();

    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP']);
  });

  it('picks up a resource from older data that carries no field type', () => {
    const character = GameCharacter.create('テスト', 1, '');
    character.detailDataElement!.appendChild(
      DataElement.create('SAN', 80, { type: DataElementType.NUMBER_RESOURCE, currentValue: 80 })
    );

    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP', 'SAN']);
  });

  it('picks up one that was added', () => {
    const character = GameCharacter.create('テスト', 1, '');
    addResource(character, '気力', 30, 20);

    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP', '気力']);
  });

  it('reads the maximum as a number', () => {
    const character = GameCharacter.create('テスト', 1, '');
    expect(resourceMax(addResource(character, '気力', 30, 20))).toBe(30);
    expect(resourceMax(addResource(character, '壊れ', 0, 0))).toBe(0);
  });

  it('keeps the remaining share between none and all', () => {
    const character = GameCharacter.create('テスト', 1, '');
    expect(resourceRatio(addResource(character, '半分', 20, 10))).toBe(0.5);
    expect(resourceRatio(addResource(character, '過剰', 20, 40))).toBe(1);
    expect(resourceRatio(addResource(character, '負値', 20, -5))).toBe(0);
    expect(resourceRatio(addResource(character, 'ゼロ最大', 0, 5))).toBe(0);
  });
});
