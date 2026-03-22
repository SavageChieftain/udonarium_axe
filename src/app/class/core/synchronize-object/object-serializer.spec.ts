import { TestBed } from '@angular/core/testing';
import { DataElement } from '@axe/data-element';

import { GameObject } from './game-object';
import { ObjectSerializer } from './object-serializer';
import { ObjectStore } from './object-store';

describe('ObjectSerializer', () => {
  let store: ObjectStore;
  let serializer: ObjectSerializer;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
    serializer = ObjectSerializer.instance;
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

  describe('instance', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = ObjectSerializer.instance;
      const instance2 = ObjectSerializer.instance;
      expect(instance1).toBe(instance2);
    });
  });

  describe('toXml()', () => {
    it('GameObjectをXML文字列に変換する', () => {
      const element = DataElement.create('test', 'value', {});
      const xml = serializer.toXml(element);

      expect(typeof xml).toBe('string');
      expect(xml).toContain('data');
      expect(xml.startsWith('<')).toBe(true);
    });

    it('属性がXMLに含まれる', () => {
      const element = DataElement.create('name', 'hello', { type: 'text' });
      const xml = serializer.toXml(element);

      expect(xml).toContain('name');
    });

    it('特殊文字がエンコードされる', () => {
      const element = DataElement.create('test', 'a&b<c>"d', {});
      const xml = serializer.toXml(element);

      expect(xml).not.toContain('&b');
      expect(xml).toContain('&amp;');
    });
  });

  describe('parseXml()', () => {
    it('XML文字列からGameObjectを復元する', () => {
      const element = DataElement.create('test', 'value', {});
      const xml = serializer.toXml(element);

      const parsed = serializer.parseXml(xml);
      expect(parsed).toBeTruthy();
      expect(parsed).toBeInstanceOf(GameObject);
    });

    it('復元したオブジェクトのaliasNameが一致する', () => {
      const element = DataElement.create('test', 'value', {});
      const xml = serializer.toXml(element);

      const parsed = serializer.parseXml(xml);
      expect(parsed.aliasName).toBe(element.aliasName);
    });

    it('不正なXMLでnullを返す', () => {
      const parsed = serializer.parseXml('<unclosed');
      expect(parsed).toBeFalsy();
    });

    it('空文字列でnullを返す', () => {
      const parsed = serializer.parseXml('');
      expect(parsed).toBeFalsy();
    });

    it('未登録のタグ名でnullを返す', () => {
      const parsed = serializer.parseXml('<unknownTag />');
      expect(parsed).toBeFalsy();
    });
  });

  describe('toAttributes()', () => {
    it('フラットなsyncDataをAttributesに変換する', () => {
      const syncData = { name: 'test', value: 42 };
      const attrs = ObjectSerializer.toAttributes(syncData);

      expect(attrs['name']).toBe('test');
      expect(attrs['value']).toBe(42);
    });

    it('ネストしたオブジェクトをドット記法に変換する', () => {
      const syncData = { location: { x: 10, y: 20 } };
      const attrs = ObjectSerializer.toAttributes(syncData);

      expect(attrs['location.x']).toBe(10);
      expect(attrs['location.y']).toBe(20);
    });

    it('配列をインデックス付きドット記法に変換する', () => {
      const syncData = { items: ['a', 'b', 'c'] };
      const attrs = ObjectSerializer.toAttributes(syncData);

      expect(attrs['items.0']).toBe('a');
      expect(attrs['items.1']).toBe('b');
      expect(attrs['items.2']).toBe('c');
    });

    it('空のsyncDataで空オブジェクトを返す', () => {
      const attrs = ObjectSerializer.toAttributes({});
      expect(Object.keys(attrs)).toHaveLength(0);
    });
  });

  describe('toXml/parseXml ラウンドトリップ', () => {
    it('DataElementのシリアライズ/デシリアライズ', () => {
      const original = DataElement.create('testName', 'testValue', {}, 'round-trip-id');
      const xml = serializer.toXml(original);
      const restored = serializer.parseXml(xml) as DataElement;

      expect(restored).toBeTruthy();
      expect(restored.aliasName).toBe(original.aliasName);
    });
  });
});
