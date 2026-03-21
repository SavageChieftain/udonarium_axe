import { TestBed } from '@angular/core/testing';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiceBot } from './dice-bot';
import { ObjectStore } from './core/synchronize-object/object-store';

describe('DiceBot', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.restoreAllMocks();
  });

  describe('インスタンス', () => {
    it('DiceBotを作成できる', () => {
      const bot = new DiceBot();
      bot.initialize();
      expect(bot).toBeTruthy();
    });

    it('aliasNameがdice-bot', () => {
      const bot = new DiceBot();
      bot.initialize();
      expect(bot.aliasName).toBe('dice-bot');
    });
  });

  describe('static メンバー', () => {
    it('diceBotInfosが配列', () => {
      expect(Array.isArray(DiceBot.diceBotInfos)).toBe(true);
    });
  });
});
