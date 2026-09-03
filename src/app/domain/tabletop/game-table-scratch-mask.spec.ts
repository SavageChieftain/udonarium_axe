import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';

describe('GameTableScratchMask', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('is created with a name and a size', () => {
      const mask = GameTableScratchMask.create('スクラッチ', 3, 4, 100);
      expect(mask).toBeTruthy();
      expect(mask.name).toBe('スクラッチ');
      expect(mask.width).toBe(3);
      expect(mask.height).toBe(4);
    });

    it('is created against an identifier of its own', () => {
      const mask = GameTableScratchMask.create('mask', 1, 1, 100, 'scratch-id');
      expect(mask.identifier).toBe('scratch-id');
    });

    it('is added to the store', () => {
      const mask = GameTableScratchMask.create('mask', 1, 1, 100);
      expect(store.get(mask.identifier)).toBe(mask);
    });

    it('starts with a cell for every square', () => {
      const mask = GameTableScratchMask.create('mask', 1, 1, 100);
      expect(mask.M).toHaveLength(2500);
    });
  });

  describe('aliasName', () => {
    it('names itself a scratch mask', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.aliasName).toBe('table-scratch-mask');
    });
  });

  describe('the defaults of the synchronised fields', () => {
    it('starts unlocked', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.isLock).toBe(false);
    });

    it('starts unscratched', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.isScratch).toBe(false);
    });

    it('starts at its default colour', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.color).toBe('#404040');
    });

    it('starts at its default scratched colour', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.changeColor).toBe('#FF5050');
    });

    it('starts unowned', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.owner).toBe('');
    });
  });

  describe('getMaxSize()', () => {
    it('returns fifty', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.getMaxSize()).toBe(50);
    });
  });

  describe('getMapXY / setMapXY', () => {
    it('writes nothing to a back map that has not been made', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      // fillMapBack is empty, guard condition prevents write
      mask.setMapXY(0, 0, false);
      // M is still untouched
      expect(mask.getMapXY(0, 0, false)).toBeTruthy();
    });

    it('the map starts filled', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.getMapXY(0, 0, false)).toBeTruthy();
    });

    it('writes to the back map once the front has been copied onto it', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      mask.setMapXY(0, 0, false);
      expect(mask.getMapXY(0, 0, true)).toBe(false);
    });

    it('reads from the back map while you are scratching', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      expect(mask.getMapXY(0, 0, true)).toBeTruthy();
    });
  });

  describe('copyMain2BackMap / copyBack2MainMap', () => {
    it('copies the front onto the back', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      // the front lands on the back
      expect(mask.getMapXY(5, 5, true)).toBeTruthy();
    });

    it('copies the back onto the front', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      // the back is changed
      mask.setMapXY(5, 5, false);
      expect(mask.getMapXY(5, 5, true)).toBe(false);

      // and copied onto the front
      mask.copyBack2MainMap();
      expect(mask.getMapXY(5, 5, false)).toBeFalsy();
    });

    it('copies a cell across, inverted', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.copyMain2BackMap();
      // it starts filled
      mask.reverseMapXY(5, 5);
      expect(mask.getMapXY(5, 5, true)).toBeFalsy();

      mask.copyBack2MainMap();
      expect(mask.getMapXY(5, 5, false)).toBeFalsy();
    });
  });

  describe('hasOwner', () => {
    it('is false while it is unowned', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.hasOwner).toBe(false);
    });

    it('is true once it has an owner', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      mask.owner = 'user-1';
      expect(mask.hasOwner).toBe(true);
    });
  });

  describe('what it inherits', () => {
    it('starts on the table', () => {
      const mask = GameTableScratchMask.create('test', 1, 1, 100);
      expect(mask.location.name).toBe('table');
    });
  });
});
