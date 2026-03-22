import { TestBed } from '@angular/core/testing';
import { DiceTable } from './dice-table';
import { DiceTablePalette } from './chat-palette';
import { ObjectStore } from './core/synchronize-object/object-store';

describe('DiceTable', () => {
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
  });

  describe('SyncVar デフォルト値', () => {
    it('name がデフォルト "ダイス表"', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.name).toBe('ダイス表');
    });

    it('command がデフォルト "SAMPLE"', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.command).toBe('SAMPLE');
    });

    it('dice がデフォルト "1d6"', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.dice).toBe('1d6');
    });
  });

  describe('create()', () => {
    it('DiceTableを作成する', () => {
      const dt = DiceTable.create();
      expect(dt).toBeTruthy();
      expect(dt.name).toBe('白紙のダイス表');
    });

    it('DiceTablePaletteが子要素として追加される', () => {
      const dt = DiceTable.create();
      expect(dt.diceTablePalette).toBeTruthy();
      expect(dt.diceTablePalette).toBeInstanceOf(DiceTablePalette);
    });

    it('ObjectStoreに追加される', () => {
      const dt = DiceTable.create();
      expect(store.get(dt.identifier)).toBe(dt);
    });
  });

  describe('diceTablePalette', () => {
    it('子要素のDiceTablePaletteを返す', () => {
      const dt = DiceTable.create();
      const palette = dt.diceTablePalette;
      expect(palette).toBeTruthy();
    });

    it('DiceTablePaletteがない場合nullを返す', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.diceTablePalette).toBeFalsy();
    });
  });
});
