import { TestBed } from '@angular/core/testing';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { Room } from '@axe/domain/peer/room';

describe('Room', () => {
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
  });

  describe('インスタンス生成', () => {
    it('Roomを作成できる', () => {
      const room = new Room();
      room.initialize();
      expect(room).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('ObjectStoreから自身を削除する', () => {
      const room = new Room();
      room.initialize();
      expect(store.get(room.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('空の状態では空文字列を返す', () => {
      const room = new Room();
      room.initialize();
      expect(room.innerXml()).toBe('');
    });
  });

  describe('parseInnerXml() — ロード時の所有解除', () => {
    it('部屋データのロード後、復元オブジェクトの owner はクリアされる', () => {
      const reloadCheck = new ReloadCheck('ReloadCheck');
      reloadCheck.initialize();
      reloadCheck.reloadCheckStart(false);

      ObjectSerializer.instance.parseXml('<room><card owner="past-session-user"></card></room>');

      const cards = store.getObjects(Card);
      expect(cards).toHaveLength(1);
      expect(cards[0].owner).toBe('');
    });
  });
});
