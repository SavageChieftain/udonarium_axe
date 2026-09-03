import { TestBed } from '@angular/core/testing';
import { setNetworkIsolated } from '@axe/core/network/network-isolation';
import { networkMessage$ } from '@axe/core/network/network-messaging';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectSerializer } from '@axe/core/sync/object-serializer';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { GameCharacter } from '@axe/domain/character/game-character';
import { createDefaultEffectPresets } from '@axe/domain/effect/builtin-effect-presets';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import { createDefaultCutIns } from '@axe/domain/media/builtin-cut-ins';
import { CutIn } from '@axe/domain/media/cut-in';
import { Party } from '@axe/domain/party/party';
import { ReloadCheck } from '@axe/domain/peer/reload-check';
import { Room } from '@axe/domain/peer/room';

describe('Room', () => {
  let store: ObjectStore;

  function loadRoom(inner: string): void {
    const reloadCheck = new ReloadCheck('ReloadCheck');
    reloadCheck.initialize();
    reloadCheck.reloadCheckStart(false);
    ObjectSerializer.instance.parseXml(`<room>${inner}</room>`);
  }

  /** Every deletion the others would be told about, out of the ones named. */
  function deletionsAmong(identifiers: Set<string>, load: () => void): string[] {
    const deleted: string[] = [];
    const off = networkMessage$.subscribe((message) => {
      if (message.eventName !== 'DELETE_GAME_OBJECT') return;
      const identifier = String((message.data as { identifier?: string }).identifier ?? '');
      if (identifiers.has(identifier)) deleted.push(identifier);
    });

    try {
      setNetworkIsolated(true);
      load();
    } finally {
      setNetworkIsolated(false);
      off();
    }
    return deleted;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = ObjectStore.instance;
  });

  describe('creating one', () => {
    it('can be created', () => {
      const room = new Room();
      room.initialize();
      expect(room).toBeTruthy();
    });
  });

  describe('onStoreAdded', () => {
    it('takes itself out of the store', () => {
      const room = new Room();
      room.initialize();
      expect(store.get(room.identifier)).toBeFalsy();
    });
  });

  describe('innerXml()', () => {
    it('writes nothing while it is empty', () => {
      const room = new Room();
      room.initialize();
      expect(room.innerXml()).toBe('');
    });
  });

  describe('saving who travels together', () => {
    function makeParty(): Party {
      const party = new Party();
      party.name = '本隊';
      party.color = '#fcd34d';
      party.initialize();
      return party;
    }

    it('writes the parties out with who belongs to each', () => {
      const party = makeParty();
      const character = GameCharacter.create('斥候', 1, '');
      character.partyIdentifier = party.identifier;

      const xml = new Room().innerXml();

      expect(xml).toContain('name="本隊"');
      expect(xml).toContain(`partyIdentifier="${party.identifier}"`);
    });

    it('reads them back', () => {
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

  describe('what happens to the effect library as it reads', () => {
    it('sends no deletions to the others for room data that carries no effects', () => {
      // Deleted and put back under the same identifiers they return here, but the others refuse
      // them as the return of what was deleted, and only whoever loaded the room still has them.
      const before = createDefaultEffectPresets();
      const identifiers = new Set(before.map((preset) => preset.identifier));

      const deleted = deletionsAmong(identifiers, () => loadRoom('<card></card>'));

      expect(deleted).toEqual([]);
      expect(store.getObjects<EffectPreset>(EffectPreset)).toHaveLength(before.length);
    });

    it('replaces them with what the room data brings, where it brings any', () => {
      createDefaultEffectPresets();

      loadRoom('<effect-preset name="持ち込みの一撃" kind="bash"></effect-preset>');

      const after = store.getObjects<EffectPreset>(EffectPreset);
      expect(after).toHaveLength(1);
      expect(after[0].name).toBe('持ち込みの一撃');
    });

    it('makes the usual set when there are none anywhere', () => {
      loadRoom('<card></card>');

      expect(store.getObjects<EffectPreset>(EffectPreset).length).toBeGreaterThan(0);
    });
  });

  describe('what happens to the sample cut-ins as it reads', () => {
    afterEach(() => {
      ImageStorage.instance.images.forEach((image) => ImageStorage.instance.delete(image.identifier));
    });

    it('sends no deletions to the others for room data saved before there were any', () => {
      const before = createDefaultCutIns(ImageStorage.instance);
      const identifiers = new Set(before.map((cutIn) => cutIn.identifier));

      const deleted = deletionsAmong(identifiers, () => loadRoom('<card></card>'));

      expect(deleted).toEqual([]);
      expect(store.getObjects(CutIn)).toHaveLength(before.length);
    });

    it('replaces them with what the room data brings, where it brings any', () => {
      createDefaultCutIns(ImageStorage.instance);

      loadRoom('<cut-in name="持ち込みの一枚"></cut-in>');

      const after = store.getObjects(CutIn);
      expect(after).toHaveLength(1);
      expect(after[0].name).toBe('持ち込みの一枚');
    });
  });

  describe('letting go of ownership as it reads', () => {
    it('clears the owner of everything it restores', () => {
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
