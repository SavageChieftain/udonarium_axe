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
    it('シングルトンインスタンスを返す', () => {
      const instance1 = DataSummarySetting.instance;
      const instance2 = DataSummarySetting.instance;
      expect(instance1).toBe(instance2);
    });

    it('identifierが"DataSummarySetting"', () => {
      expect(DataSummarySetting.instance.identifier).toBe('DataSummarySetting');
    });
  });

  describe('SyncVar デフォルト値', () => {
    it('sortTag がデフォルト "HP"', () => {
      expect(DataSummarySetting.instance.sortTag).toBe('HP');
    });

    it('sortOrder がデフォルト ASC', () => {
      expect(DataSummarySetting.instance.sortOrder).toBe(SortOrder.ASC);
    });

    it('sortTag2nd がデフォルト "name"', () => {
      expect(DataSummarySetting.instance.sortTag2nd).toBe('name');
    });

    it('sortOrder2nd がデフォルト ASC', () => {
      expect(DataSummarySetting.instance.sortOrder2nd).toBe(SortOrder.ASC);
    });

    it('dataTag がデフォルト値', () => {
      expect(DataSummarySetting.instance.dataTag).toBe('HP MP 敏捷度 精神力');
    });
  });

  describe('dataTags', () => {
    it('スペース区切りの配列を返す', () => {
      const tags = DataSummarySetting.instance.dataTags;
      expect(tags).toEqual(['HP', 'MP', '敏捷度', '精神力']);
    });

    it('キャッシュが効いて同じ配列を返す', () => {
      const tags1 = DataSummarySetting.instance.dataTags;
      const tags2 = DataSummarySetting.instance.dataTags;
      expect(tags1).toBe(tags2);
    });

    it('dataTagを変更すると新しい配列を生成する', () => {
      const instance = DataSummarySetting.instance;
      const tags1 = instance.dataTags;
      instance.dataTag = 'HP MP';
      const tags2 = instance.dataTags;
      expect(tags2).toEqual(['HP', 'MP']);
      expect(tags1).not.toBe(tags2);
    });
  });

  describe('innerXml / parseInnerXml', () => {
    it('innerXmlは空文字列を返す', () => {
      expect(DataSummarySetting.instance.innerXml()).toBe('');
    });
  });
});
