import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';

describe('TableSelecter', () => {
  let store: ObjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (TableSelecter as unknown as Record<string, unknown>)._instance = undefined;
  });

  afterEach(() => {
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    (TableSelecter as unknown as Record<string, unknown>)._instance = undefined;
    vi.restoreAllMocks();
  });

  describe('instance (singleton)', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = TableSelecter.instance;
      const instance2 = TableSelecter.instance;
      expect(instance1).toBe(instance2);
    });

    it('identifierが"TableSelecter"', () => {
      expect(TableSelecter.instance.identifier).toBe('TableSelecter');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('viewTableIdentifier がデフォルト空文字', () => {
      expect(TableSelecter.instance.viewTableIdentifier).toBe('');
    });

    it('tableGridDummy がデフォルト false', () => {
      expect(TableSelecter.instance.tableGridDummy).toBe(false);
    });
  });

  describe('プロパティ', () => {
    it('gridShow のデフォルトはfalse', () => {
      expect(TableSelecter.instance.gridShow).toBe(false);
    });

    it('gridSnap のデフォルトはtrue', () => {
      expect(TableSelecter.instance.gridSnap).toBe(true);
    });
  });
});
