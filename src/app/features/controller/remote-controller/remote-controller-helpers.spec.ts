import { TestBed } from '@angular/core/testing';
import { Network } from '@axe/core/index';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataSummarySetting } from '@axe/domain/data/data-summary-setting';
import {
  getGameObjects,
  getInventory,
  getInventoryTags,
  getTabTitle,
  getTargetCharacters,
  RemoteControllerInventoryContext,
} from '@axe/features/controller/remote-controller/remote-controller-helpers';
import { ObjectInventory } from '@axe/shared/inventory/object-inventory';
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
