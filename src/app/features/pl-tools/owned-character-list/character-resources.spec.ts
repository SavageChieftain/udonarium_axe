import { ObjectStore } from '@axe/core/sync/object-store';
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
  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  it('既定テンプレートの HP / MP を拾う', () => {
    const character = GameCharacter.create('テスト', 1, '');
    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP']);
  });

  it('コマ画像・立ち絵位置の内部要素は除く', () => {
    const character = GameCharacter.create('テスト', 1, '');
    character.addExtendData();

    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP']);
  });

  it('fieldType 属性を持たない旧データのリソースも拾う', () => {
    const character = GameCharacter.create('テスト', 1, '');
    character.detailDataElement!.appendChild(
      DataElement.create('SAN', 80, { type: DataElementType.NUMBER_RESOURCE, currentValue: 80 })
    );

    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP', 'SAN']);
  });

  it('追加したリソースも拾う', () => {
    const character = GameCharacter.create('テスト', 1, '');
    addResource(character, '気力', 30, 20);

    expect(resourceElementsOf(character).map((element) => element.name)).toEqual(['HP', 'MP', '気力']);
  });

  it('最大値を数値として読む', () => {
    const character = GameCharacter.create('テスト', 1, '');
    expect(resourceMax(addResource(character, '気力', 30, 20))).toBe(30);
    expect(resourceMax(addResource(character, '壊れ', 0, 0))).toBe(0);
  });

  it('残量比を 0〜1 に丸める', () => {
    const character = GameCharacter.create('テスト', 1, '');
    expect(resourceRatio(addResource(character, '半分', 20, 10))).toBe(0.5);
    expect(resourceRatio(addResource(character, '過剰', 20, 40))).toBe(1);
    expect(resourceRatio(addResource(character, '負値', 20, -5))).toBe(0);
    expect(resourceRatio(addResource(character, 'ゼロ最大', 0, 5))).toBe(0);
  });
});
