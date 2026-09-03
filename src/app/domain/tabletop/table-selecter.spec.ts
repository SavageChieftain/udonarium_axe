import { TestBed } from '@angular/core/testing';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';

describe('TableSelecter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    (TableSelecter as unknown as Record<string, unknown>)._instance = undefined;
  });

  afterEach(() => {
    (TableSelecter as unknown as Record<string, unknown>)._instance = undefined;
    vi.restoreAllMocks();
  });

  describe('instance (singleton)', () => {
    it('returns the one instance', () => {
      const instance1 = TableSelecter.instance;
      const instance2 = TableSelecter.instance;
      expect(instance1).toBe(instance2);
    });

    it('identifies itself as the table selector', () => {
      expect(TableSelecter.instance.identifier).toBe('TableSelecter');
    });
  });

  describe('the defaults of the synchronised fields', () => {
    it('starts naming no table', () => {
      expect(TableSelecter.instance.viewTableIdentifier).toBe('');
    });
  });
});
