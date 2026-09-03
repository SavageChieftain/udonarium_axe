import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DiceTablePalette } from '@axe/domain/chat/chat-palette';
import { DiceTable } from '@axe/domain/dice/dice-table';

describe('DiceTable', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  describe('the defaults of the synchronised fields', () => {
    it('starts with the default name', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.name).toBe('ダイス表');
    });

    it('starts with the default command', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.command).toBe('SAMPLE');
    });

    it('starts with the default dice', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.dice).toBe('1d6');
    });
  });

  describe('create()', () => {
    it('creates a table', () => {
      const dt = DiceTable.create();
      expect(dt).toBeTruthy();
      expect(dt.name).toBe('白紙のダイス表');
    });

    it('gives it a palette as a child', () => {
      const dt = DiceTable.create();
      expect(dt.diceTablePalette).toBeTruthy();
      expect(dt.diceTablePalette).toBeInstanceOf(DiceTablePalette);
    });

    it('is added to the store', () => {
      const dt = DiceTable.create();
      expect(store.get(dt.identifier)).toBe(dt);
    });
  });

  describe('diceTablePalette', () => {
    it('returns that palette', () => {
      const dt = DiceTable.create();
      const palette = dt.diceTablePalette;
      expect(palette).toBeTruthy();
    });

    it('returns nothing when there is none', () => {
      const dt = new DiceTable();
      dt.initialize();
      expect(dt.diceTablePalette).toBeFalsy();
    });
  });
});
