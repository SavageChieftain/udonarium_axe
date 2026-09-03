import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';

describe('GameTableMask', () => {
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
      const mask = GameTableMask.create('テストマスク', 3, 4, 100);
      expect(mask).toBeTruthy();
      expect(mask.name).toBe('テストマスク');
      expect(mask.width).toBe(3);
      expect(mask.height).toBe(4);
    });

    it('is created against an identifier of its own', () => {
      const mask = GameTableMask.create('mask', 1, 1, 100, 'mask-id');
      expect(mask.identifier).toBe('mask-id');
    });

    it('is added to the store', () => {
      const mask = GameTableMask.create('mask', 1, 1, 100);
      expect(store.get(mask.identifier)).toBe(mask);
    });
  });

  describe('aliasName', () => {
    it('names itself a mask', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.aliasName).toBe('table-mask');
    });
  });

  describe('the defaults of the synchronised fields', () => {
    it('starts unlocked', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.isLock).toBe(false);
    });

    it('starts unowned', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.owner).toBe('');
    });

    it('starts showing the lock mark', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.dispLockMark).toBe(true);
    });

    it('starts out of preview', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.isPreview).toBe(false);
    });
  });

  describe('hasOwner', () => {
    it('is false while it is unowned', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.hasOwner).toBe(false);
    });

    it('is true once it has an owner', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      mask.owner = 'user-1';
      expect(mask.hasOwner).toBe(true);
    });
  });

  describe('ownerColor', () => {
    it('returns its own colour', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.ownerColor).toBe('#444444');
    });
  });

  describe('color', () => {
    it('falls back to a default colour when it carries none', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.color).toBe('#555555');
    });

    it('returns the colour it carries', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      mask.commonDataElement!.appendChild(
        DataElement.create('color', '#FF0000', { type: 'colors', currentValue: '#0a0a0a' }, 'color_' + mask.identifier)
      );
      expect(mask.color).toBe('#FF0000');
    });

    it('takes a new colour', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      mask.commonDataElement!.appendChild(
        DataElement.create('color', '#555555', { type: 'colors', currentValue: '#0a0a0a' }, 'color_' + mask.identifier)
      );
      mask.color = '#00FF00';
      expect(mask.color).toBe('#00FF00');
    });

    it('falls back to a default background when it carries none', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.bgcolor).toBe('#0a0a0a');
    });
  });

  describe('what it inherits', () => {
    it('starts on the table', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.location.name).toBe('table');
    });
  });
});
