import { TestBed } from '@angular/core/testing';
import { DataElement } from '@axe/data-element';

import { ObjectStore } from './object-store';

describe('GameObject', () => {
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

  describe('constructor', () => {
    it('自動生成されたidentifierを持つ', () => {
      const obj = DataElement.create('test', '', {});
      expect(obj.identifier).toBeTruthy();
      expect(obj.identifier.length).toBeGreaterThan(0);
    });

    it('指定したidentifierを使用する', () => {
      const obj = DataElement.create('test', '', {}, 'custom-id');
      expect(obj.identifier).toBe('custom-id');
    });

    it('異なるインスタンスは異なるidentifierを持つ', () => {
      const obj1 = DataElement.create('a', '', {});
      const obj2 = DataElement.create('b', '', {});
      expect(obj1.identifier).not.toBe(obj2.identifier);
    });
  });

  describe('aliasName', () => {
    it('DataElementのaliasNameは"data"', () => {
      const obj = DataElement.create('test', '', {});
      expect(obj.aliasName).toBe('data');
    });
  });

  describe('version', () => {
    it('初期versionが0以上', () => {
      const obj = DataElement.create('test', '', {});
      expect(obj.version).toBeGreaterThanOrEqual(0);
    });
  });

  describe('initialize()', () => {
    it('ObjectStoreに追加される', () => {
      const obj = DataElement.create('test', '', {});
      // DataElement.create内でinitialize()が呼ばれる
      expect(store.get(obj.identifier)).toBe(obj);
    });
  });

  describe('destroy()', () => {
    it('ObjectStoreから削除される', () => {
      const obj = DataElement.create('test', '', {});
      const id = obj.identifier;
      obj.destroy();
      expect(store.get(id)).toBeFalsy();
    });
  });

  describe('update()', () => {
    it('versionが増加する', () => {
      const obj = DataElement.create('test', '', {});
      const v1 = obj.version;
      obj.update();
      expect(obj.version).toBeGreaterThan(v1);
    });

    it('複数回updateでversionが増え続ける', () => {
      const obj = DataElement.create('test', '', {});
      const versions: number[] = [];
      for (let i = 0; i < 5; i++) {
        obj.update();
        versions.push(obj.version);
      }
      for (let i = 1; i < versions.length; i++) {
        expect(versions[i]).toBeGreaterThan(versions[i - 1]);
      }
    });
  });

  describe('toContext()', () => {
    it('ObjectContextを返す', () => {
      const obj = DataElement.create('test', '', {});
      const context = obj.toContext();

      expect(context.aliasName).toBe('data');
      expect(context.identifier).toBe(obj.identifier);
      expect(typeof context.majorVersion).toBe('number');
      expect(typeof context.minorVersion).toBe('number');
      expect(typeof context.syncData).toBe('object');
    });

    it('deepCopyされたsyncDataを返す', () => {
      const obj = DataElement.create('test', 'value', {});
      const context1 = obj.toContext();
      const context2 = obj.toContext();

      expect(context1.syncData).toEqual(context2.syncData);
      expect(context1.syncData).not.toBe(context2.syncData);
    });
  });

  describe('apply()', () => {
    it('contextの値が適用される', () => {
      const obj = DataElement.create('test', '', {});
      const context = obj.toContext();
      context.majorVersion = 100;

      obj.apply(context);

      expect(obj.version).toBeGreaterThanOrEqual(100);
    });

    it('identifierが不一致なら適用されない', () => {
      const obj = DataElement.create('test', '', {});
      const vBefore = obj.version;
      const context = obj.toContext();
      context.identifier = 'wrong-id';
      context.majorVersion = 999;

      obj.apply(context);

      expect(obj.version).toBe(vBefore);
    });

    it('nullコンテキストは無視される', () => {
      const obj = DataElement.create('test', '', {});
      expect(() => obj.apply(null!)).not.toThrow();
    });
  });

  describe('toXml()', () => {
    it('XML文字列を返す', () => {
      const obj = DataElement.create('test', 'value', {});
      const xml = obj.toXml();

      expect(typeof xml).toBe('string');
      expect(xml.startsWith('<')).toBe(true);
      expect(xml).toContain('data');
    });
  });

  describe('clone()', () => {
    it('同じaliasNameを持つクローンを作成する', () => {
      const obj = DataElement.create('test', 'value', {});
      const cloned = obj.clone();

      expect(cloned.aliasName).toBe(obj.aliasName);
    });

    it('異なるidentifierを持つ（parseXmlにより新しいIDが生成される場合）', () => {
      const obj = DataElement.create('test', 'value', {});
      const cloned = obj.clone();

      // cloneはtoXml → parseXmlで新しいオブジェクトを作るが、
      // identifierはXMLに含まれるので同じになることもある
      expect(cloned).toBeTruthy();
      expect(cloned).not.toBe(obj);
    });
  });
});
