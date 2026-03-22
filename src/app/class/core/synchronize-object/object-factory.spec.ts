import { TestBed } from '@angular/core/testing';

import { GameObject } from './game-object';
import { ObjectFactory } from './object-factory';
import { ObjectStore } from './object-store';

describe('ObjectFactory', () => {
  let factory: ObjectFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    factory = ObjectFactory.instance;
  });

  afterEach(() => {
    // ObjectStoreのクリーンアップ
    const store = ObjectStore.instance;
    const allObjects = store.getObjects();
    allObjects.forEach((obj) => store.delete(obj, false));
    store.clearDeleteHistory();
    vi.clearAllMocks();
  });

  describe('instance', () => {
    it('シングルトンインスタンスを返す', () => {
      const instance1 = ObjectFactory.instance;
      const instance2 = ObjectFactory.instance;
      expect(instance1).toBe(instance2);
    });

    it('ObjectFactoryのインスタンスである', () => {
      expect(factory).toBeInstanceOf(ObjectFactory);
    });
  });

  describe('register()', () => {
    it('@SyncObjectで登録済みのクラスのaliasを取得できる', () => {
      // GameObjectは初期化時にObjectFactoryに登録済み
      // SyncObjectデコレータで登録されたクラスがgetAliasで取得できることを確認
      const alias = factory.getAlias(GameObject);
      expect(typeof alias).toBe('string');
    });
  });

  describe('create()', () => {
    it('登録済みのaliasでインスタンスを生成する', () => {
      // DataElementは@SyncObject('data')で登録済み
      const obj = factory.create('data');
      expect(obj).toBeTruthy();
      expect(obj).toBeInstanceOf(GameObject);
    });

    it('identifierを指定してインスタンスを生成する', () => {
      const obj = factory.create('data', 'test-id');
      expect(obj).toBeTruthy();
      expect(obj!.identifier).toBe('test-id');
    });

    it('未登録のaliasでnullを返す', () => {
      const obj = factory.create('nonexistent-alias');
      expect(obj).toBeNull();
    });
  });

  describe('getAlias()', () => {
    it('未登録のコンストラクタで空文字列を返す', () => {
      class UnregisteredClass extends GameObject {}
      const alias = factory.getAlias(UnregisteredClass);
      expect(alias).toBe('');
    });
  });
});
