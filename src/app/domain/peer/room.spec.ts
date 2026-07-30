import { TestBed } from '@angular/core/testing';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { GameCharacter } from '@axe/domain/character/game-character';
import { Party } from '@axe/domain/party/party';
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

  describe('同行の保存', () => {
    function makeParty(): Party {
      const party = new Party();
      party.name = '本隊';
      party.color = '#fcd34d';
      party.initialize();
      return party;
    }

    it('パーティとキャラクターの所属を書き出す', () => {
      const party = makeParty();
      const character = GameCharacter.create('斥候', 1, '');
      character.partyIdentifier = party.identifier;

      const xml = new Room().innerXml();

      expect(xml).toContain('name="本隊"');
      expect(xml).toContain(`partyIdentifier="${party.identifier}"`);
    });

    it('ロードでパーティと所属を復元する', () => {
      const party = makeParty();
      const character = GameCharacter.create('斥候', 1, '');
      character.partyIdentifier = party.identifier;
      const xml = `<room>${new Room().innerXml()}</room>`;

      const reloadCheck = new ReloadCheck('ReloadCheck');
      reloadCheck.initialize();
      reloadCheck.reloadCheckStart(false);
      ObjectSerializer.instance.parseXml(xml);

      const parties = store.getObjects(Party);
      expect(parties).toHaveLength(1);
      expect(parties[0].name).toBe('本隊');
      expect(parties[0].color).toBe('#fcd34d');
      expect(store.getObjects(GameCharacter)[0].partyIdentifier).toBe(parties[0].identifier);
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
