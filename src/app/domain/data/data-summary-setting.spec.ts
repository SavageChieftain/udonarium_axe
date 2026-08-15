import { TestBed } from '@angular/core/testing';
import { ObjectStore } from '@axe/core/sync/object-store';
import { DataSummarySetting, SortOrder } from '@axe/domain/data/data-summary-setting';

describe('DataSummarySetting', () => {
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
    // Reset singleton
    (DataSummarySetting as unknown as Record<string, unknown>)['_instance'] = undefined;
  });

  describe('SortOrder enum', () => {
    it('ASC = "ASC"', () => {
      expect(SortOrder.ASC).toBe('ASC');
    });

    it('DESC = "DESC"', () => {
      expect(SortOrder.DESC).toBe('DESC');
    });
  });

  describe('instance (singleton)', () => {
    it('returns the one instance', () => {
      const instance1 = DataSummarySetting.instance;
      const instance2 = DataSummarySetting.instance;
      expect(instance1).toBe(instance2);
    });

    it('identifies itself as the summary setting', () => {
      expect(DataSummarySetting.instance.identifier).toBe('DataSummarySetting');
    });
  });

  describe('the defaults of the synchronised fields', () => {
    it('starts sorting by the first resource', () => {
      expect(DataSummarySetting.instance.sortTag).toBe('HP');
    });

    it('starts sorting upwards', () => {
      expect(DataSummarySetting.instance.sortOrder).toBe(SortOrder.ASC);
    });

    it('starts breaking ties by name', () => {
      expect(DataSummarySetting.instance.sortTag2nd).toBe('name');
    });

    it('breaks them upwards', () => {
      expect(DataSummarySetting.instance.sortOrder2nd).toBe(SortOrder.ASC);
    });

    it('starts with the default tags', () => {
      expect(DataSummarySetting.instance.dataTag).toBe('HP MP 敏捷度 精神力');
    });
  });

  describe('dataTags', () => {
    it('returns them apart by their spaces', () => {
      const tags = DataSummarySetting.instance.dataTags;
      expect(tags).toEqual(['HP', 'MP', '敏捷度', '精神力']);
    });

    it('returns the same list again from the cache', () => {
      const tags1 = DataSummarySetting.instance.dataTags;
      const tags2 = DataSummarySetting.instance.dataTags;
      expect(tags1).toBe(tags2);
    });

    it('builds a new one when the tags change', () => {
      const instance = DataSummarySetting.instance;
      const tags1 = instance.dataTags;
      instance.dataTag = 'HP MP';
      const tags2 = instance.dataTags;
      expect(tags2).toEqual(['HP', 'MP']);
      expect(tags1).not.toBe(tags2);
    });
  });

  describe('innerXml / parseInnerXml', () => {
    it('writes nothing inside itself', () => {
      expect(DataSummarySetting.instance.innerXml()).toBe('');
    });
  });
});
