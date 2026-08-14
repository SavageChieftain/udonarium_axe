import { TestBed } from '@angular/core/testing';
import { setNetworkIsolated } from '@axe/core/network/network-isolation';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { GameCharacter } from '@axe/domain/character/game-character';
import { createDefaultEffectPresets } from '@axe/domain/effect/builtin-effect-presets';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
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

  describe('parseInnerXml() — 演出集の扱い', () => {
    function loadRoom(inner: string): void {
      const reloadCheck = new ReloadCheck('ReloadCheck');
      reloadCheck.initialize();
      reloadCheck.reloadCheckStart(false);
      ObjectSerializer.instance.parseXml(`<room>${inner}</room>`);
    }

    it('演出の入っていない部屋データでは同卓者へ削除を配らないこと', () => {
      // 消してから同じ identifier で入れ直すと、手元では戻るが、同卓者側では
      // 「消えた物の復活」として拒まれ、読み込んだ本人にだけ演出が残る。
      const before = createDefaultEffectPresets();
      const identifiers = new Set(before.map((preset) => preset.identifier));
      const deleted: string[] = [];
      const off = networkMessage$.subscribe((message) => {
        if (message.eventName !== 'DELETE_GAME_OBJECT') return;
        const identifier = String((message.data as { identifier?: string }).identifier ?? '');
        if (identifiers.has(identifier)) deleted.push(identifier);
      });

      try {
        setNetworkIsolated(true);
        loadRoom('<card></card>');
      } finally {
        setNetworkIsolated(false);
        off();
      }

      expect(deleted).toEqual([]);
      expect(store.getObjects<EffectPreset>(EffectPreset)).toHaveLength(before.length);
    });

    it('演出を持ち込んだ部屋データでは持ち込みに入れ替えること', () => {
      createDefaultEffectPresets();

      loadRoom('<effect-preset name="持ち込みの一撃" kind="bash"></effect-preset>');

      const after = store.getObjects<EffectPreset>(EffectPreset);
      expect(after).toHaveLength(1);
      expect(after[0].name).toBe('持ち込みの一撃');
    });

    it('どこにも演出が無ければ既定を用意すること', () => {
      loadRoom('<card></card>');

      expect(store.getObjects<EffectPreset>(EffectPreset).length).toBeGreaterThan(0);
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
