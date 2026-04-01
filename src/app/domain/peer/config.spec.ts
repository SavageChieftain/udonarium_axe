import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Config } from '@axe/domain/peer/config';

describe('Config', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (Config as unknown as { _instance: Config | undefined })._instance = undefined;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (Config as unknown as { _instance: Config | undefined })._instance = undefined;
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = Config.instance;
      const instance2 = Config.instance;
      expect(instance1).toBe(instance2);
    });

    it('identifierが"Config"', () => {
      expect(Config.instance.identifier).toBe('Config');
    });
  });

  describe('defaultDiceBot', () => {
    it('デフォルト値は "DiceBot"', () => {
      expect(Config.instance.defaultDiceBot).toBe('DiceBot');
    });

    it('設定した値を返す', () => {
      Config.instance.defaultDiceBot = 'Cthulhu7th';
      expect(Config.instance.defaultDiceBot).toBe('Cthulhu7th');
    });

    it('空文字列を設定すると"DiceBot"を返す', () => {
      Config.instance.defaultDiceBot = '';
      expect(Config.instance.defaultDiceBot).toBe('DiceBot');
    });
  });

  describe('roomVolume', () => {
    it('デフォルト値は 1.0', () => {
      expect(Config.instance.roomVolume).toBe(1.0);
    });

    it('設定した値を返す', () => {
      Config.instance.roomVolume = 0.5;
      expect(Config.instance.roomVolume).toBe(0.5);
    });
  });

  describe('roomGridDispAlways', () => {
    it('デフォルト値は false', () => {
      expect(Config.instance.roomGridDispAlways).toBe(false);
    });

    it('設定した値を返す', () => {
      Config.instance.roomGridDispAlways = true;
      expect(Config.instance.roomGridDispAlways).toBe(true);
    });
  });
});
