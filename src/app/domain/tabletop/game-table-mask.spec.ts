import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataElement } from '@axe/domain/data/data-element';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';

describe('GameTableMask', () => {
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
    vi.clearAllMocks();
  });

  describe('create()', () => {
    it('名前とサイズを指定して作成する', () => {
      const mask = GameTableMask.create('テストマスク', 3, 4, 100);
      expect(mask).toBeTruthy();
      expect(mask.name).toBe('テストマスク');
      expect(mask.width).toBe(3);
      expect(mask.height).toBe(4);
    });

    it('カスタムidentifierで作成する', () => {
      const mask = GameTableMask.create('mask', 1, 1, 100, 'mask-id');
      expect(mask.identifier).toBe('mask-id');
    });

    it('ObjectStoreに追加される', () => {
      const mask = GameTableMask.create('mask', 1, 1, 100);
      expect(store.get(mask.identifier)).toBe(mask);
    });
  });

  describe('aliasName', () => {
    it('"table-mask"を返す', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.aliasName).toBe('table-mask');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('isLock がデフォルト false', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.isLock).toBe(false);
    });

    it('owner がデフォルト空文字', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.owner).toBe('');
    });

    it('dispLockMark がデフォルト true', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.dispLockMark).toBe(true);
    });

    it('isPreview がデフォルト false', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.isPreview).toBe(false);
    });
  });

  describe('hasOwner', () => {
    it('ownerが空文字ならfalse', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.hasOwner).toBe(false);
    });

    it('ownerがセットされていればtrue', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      mask.owner = 'user-1';
      expect(mask.hasOwner).toBe(true);
    });
  });

  describe('ownerColor', () => {
    it('"#444444"を返す', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.ownerColor).toBe('#444444');
    });
  });

  describe('color', () => {
    it('color DataElementが無い場合デフォルト"#555555"を返す', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.color).toBe('#555555');
    });

    it('color DataElementがあれば値を取得できる', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      mask.commonDataElement!.appendChild(
        DataElement.create('color', '#FF0000', { type: 'colors', currentValue: '#0a0a0a' }, 'color_' + mask.identifier)
      );
      expect(mask.color).toBe('#FF0000');
    });

    it('color DataElementがあればsetterで値を更新できる', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      mask.commonDataElement!.appendChild(
        DataElement.create('color', '#555555', { type: 'colors', currentValue: '#0a0a0a' }, 'color_' + mask.identifier)
      );
      mask.color = '#00FF00';
      expect(mask.color).toBe('#00FF00');
    });

    it('bgcolor DataElementが無い場合デフォルト"#0a0a0a"を返す', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.bgcolor).toBe('#0a0a0a');
    });
  });

  describe('TabletopObject 継承', () => {
    it('locationのデフォルトがtable', () => {
      const mask = GameTableMask.create('test', 1, 1, 100);
      expect(mask.location.name).toBe('table');
    });
  });
});
