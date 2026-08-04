import { TestBed } from '@angular/core/testing';
import { ObjectInventory } from '@axe/application/inventory/object-inventory';
import { Network } from '@axe/core/index';
import { ObjectStore } from '@axe/core/sync/object-store';
import { resolveBuffColor } from '@axe/domain/character/buff-appearance';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
import { parseBuffInput } from '@axe/features/controller/remote-controller/remote-controller-buff';
import {
  getCounterElements,
  getGameObjects,
  getInventory,
  getInventoryTags,
  getTabTitle,
  getTargetCharacters,
  RemoteControllerInventoryContext,
} from '@axe/features/controller/remote-controller/remote-controller-helpers';
import { TEST_PROVIDERS } from '@axe/testing/test-providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('remote-controller-helpers', () => {
  let inventoryContext: RemoteControllerInventoryContext;
  const createdChars: GameCharacter[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...TEST_PROVIDERS] });
    DataSummarySetting.instance.dataTag = '';
    inventoryContext = {
      tableInventory: new ObjectInventory((object) => object.location.name === 'table'),
      commonInventory: new ObjectInventory(() => false),
      privateInventory: new ObjectInventory((object) => object.location.name === Network.peerId),
      graveyardInventory: new ObjectInventory((object) => object.location.name === 'graveyard'),
    };
  });

  afterEach(() => {
    for (const char of createdChars) {
      ObjectStore.instance.remove(char);
    }
    createdChars.length = 0;
    DataSummarySetting.instance.dataTag = 'HP MP SAN 敏捷度 精神力 情報';
  });

  function createChar(name: string, location = 'table'): GameCharacter {
    const char = GameCharacter.create(name, 1, '');
    char.location.name = location;
    createdChars.push(char);
    return char;
  }

  describe('parseBuffInput', () => {
    it('名前・情報・ラウンドを空白区切りで読むこと', () => {
      expect(parseBuffInput('猛攻撃 攻撃+2 5')).toMatchObject({ buffname: '猛攻撃', sub: '攻撃+2', round: 5 });
    });

    it('4 つ目以降で色とアイコンを指定できること', () => {
      const parsed = parseBuffInput('毒 継続2 3 red ☠️');

      expect(parsed!.appearance).toEqual({ color: resolveBuffColor('red'), icon: '☠️' });
      expect(parsed!.bufftext).toContain('red');
    });

    it('見た目の指定が無ければ空になること', () => {
      expect(parseBuffInput('猛攻撃')!.appearance).toEqual({});
    });

    it('空文字では読まないこと', () => {
      expect(parseBuffInput('')).toBeNull();
    });
  });

  describe('getTabTitle', () => {
    it('should return "テーブル" for "table" type', () => {
      expect(getTabTitle('table')).toBe('テーブル');
    });

    it('should return "個人" for Network.peerId type', () => {
      expect(getTabTitle(Network.peerId)).toBe('個人');
    });

    it('should return "墓場" for "graveyard" type', () => {
      expect(getTabTitle('graveyard')).toBe('墓場');
    });

    it('should return "共有" for other types', () => {
      expect(getTabTitle('common')).toBe('共有');
    });
  });

  describe('getInventory', () => {
    it('should return tableInventory for "table" type', () => {
      const inventory = getInventory('table', inventoryContext);
      expect(inventory).toBe(inventoryContext.tableInventory);
    });

    it('should return privateInventory for Network.peerId type', () => {
      const inventory = getInventory(Network.peerId, inventoryContext);
      expect(inventory).toBe(inventoryContext.privateInventory);
    });

    it('should return graveyardInventory for "graveyard" type', () => {
      const inventory = getInventory('graveyard', inventoryContext);
      expect(inventory).toBe(inventoryContext.graveyardInventory);
    });

    it('should return commonInventory for other types', () => {
      const inventory = getInventory('common', inventoryContext);
      expect(inventory).toBe(inventoryContext.commonInventory);
    });
  });

  describe('getInventoryTags', () => {
    it('should return empty array when no tags exist for character', () => {
      const character = createChar('char-1');
      inventoryContext.tableInventory.refreshObjects();
      inventoryContext.tableInventory.refreshDataElements();

      const result = getInventoryTags(character, inventoryContext);
      expect(result).toEqual([]);
    });
  });

  describe('getCounterElements', () => {
    it('階層の深いリソースでもタグ順に拾えること', () => {
      const char = createChar('カウンター対象');

      const elements = getCounterElements(char, ['HP', 'MP']);

      expect(elements.map((element) => element.name)).toEqual(['HP', 'MP']);
      expect(elements.every((element) => element.isNumberResource)).toBe(true);
    });

    it('存在しないタグは飛ばすこと', () => {
      const char = createChar('カウンター対象');

      expect(getCounterElements(char, ['HP', '架空の項目', 'MP']).map((element) => element.name)).toEqual(['HP', 'MP']);
    });

    it('同じ項目を重ねて返さないこと', () => {
      const char = createChar('カウンター対象');

      expect(getCounterElements(char, ['HP', 'HP'])).toHaveLength(1);
    });

    it('タグが空なら空を返すこと', () => {
      expect(getCounterElements(createChar('カウンター対象'), [])).toEqual([]);
    });
  });

  describe('getGameObjects', () => {
    it('should filter out hideInventory characters for table type', () => {
      const char1 = createChar('visible');
      const char2 = createChar('hidden');
      char1.hideInventory = false;
      char2.hideInventory = true;
      inventoryContext.tableInventory.refreshObjects();

      const result = getGameObjects('table', inventoryContext);
      expect(result).toContain(char1);
      expect(result).not.toContain(char2);
    });

    it('should return empty array for non-table types', () => {
      const result = getGameObjects('common', inventoryContext);
      expect(result).toEqual([]);
    });
  });

  describe('getTargetCharacters', () => {
    it('should return all non-hidden characters in objectList when checkedOnly=false', () => {
      const mockChar1 = createChar('a');
      const mockChar2 = createChar('b');
      const mockChar3 = createChar('c');
      mockChar1.hideInventory = false;
      mockChar1.targeted = false;
      mockChar2.hideInventory = false;
      mockChar2.targeted = true;
      mockChar3.hideInventory = true;
      mockChar3.targeted = true;

      const result = getTargetCharacters([mockChar1, mockChar2, mockChar3], false);
      expect(result.length).toBe(2);
      expect(result).toContain(mockChar1);
      expect(result).toContain(mockChar2);
    });

    it('should return only targeted characters when checkedOnly=true', () => {
      const mockChar1 = createChar('a');
      const mockChar2 = createChar('b');
      mockChar1.hideInventory = false;
      mockChar1.targeted = false;
      mockChar2.hideInventory = false;
      mockChar2.targeted = true;

      const result = getTargetCharacters([mockChar1, mockChar2], true);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(mockChar2);
    });

    it('should never include hideInventory characters even when targeted=true', () => {
      const mockChar = createChar('hidden');
      mockChar.hideInventory = true;
      mockChar.targeted = true;

      const result = getTargetCharacters([mockChar], false);
      expect(result.length).toBe(0);
    });
  });
});
