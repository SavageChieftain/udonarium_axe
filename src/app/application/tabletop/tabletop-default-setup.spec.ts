import { makeDefaultTabletopObjects } from '@axe/application/tabletop/tabletop-default-setup';
import { ImageStorage } from '@axe/core/storage/image-storage';
import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';
import { Party } from '@axe/domain/party/party';

describe('the pieces a first table is set out with', () => {
  function clearStore(): void {
    const store = ObjectStore.instance;
    for (const object of store.getObjects()) store.delete(object, false);
    store.clearDeleteHistory();
  }

  function sample(name: string): GameCharacter {
    const found = ObjectStore.instance.getObjects<GameCharacter>(GameCharacter).find((piece) => piece.name === name);
    expect(found).toBeTruthy();
    return found!;
  }

  function statOf(character: GameCharacter, name: string): number {
    return Number(DataElement.findElementByReference(character.rootDataElement!, name)?.value);
  }

  beforeEach(() => {
    clearStore();
    makeDefaultTabletopObjects(ImageStorage.instance);
  });

  afterEach(() => clearStore());

  describe('the party the sample pieces are set out in', () => {
    function partyOf(name: string): string {
      return sample(name).partyIdentifier;
    }

    it('puts the three player characters in one party', () => {
      const party = partyOf('キャラクターA');
      expect(party).toBeTruthy();
      expect(partyOf('キャラクターB')).toBe(party);
      expect(partyOf('キャラクターC')).toBe(party);
    });

    it('builds that party, so it can be read and renamed like any other', () => {
      const party = ObjectStore.instance.get<Party>(partyOf('キャラクターA'));
      expect(party).toBeInstanceOf(Party);
      expect(party!.name).toBe('パーティ1');
    });

    it('leaves the monsters out of it, since a party shares what it sees', () => {
      for (const name of ['モンスターA', 'モンスターB', 'モンスターC']) {
        expect(partyOf(name)).toBe('');
      }
    });

    it('gives the player characters eyes, and the monsters none', () => {
      for (const name of ['キャラクターA', 'キャラクターB', 'キャラクターC']) {
        expect(sample(name).visionRange).toBe(2);
      }
      for (const name of ['モンスターA', 'モンスターB', 'モンスターC']) {
        expect(sample(name).visionRange).toBe(0);
      }
    });
  });

  it('sets out three of a party and three to fight', () => {
    for (const name of [
      'キャラクターA',
      'キャラクターB',
      'キャラクターC',
      'モンスターA',
      'モンスターB',
      'モンスターC',
    ]) {
      expect(sample(name)).toBeTruthy();
    }
  });

  it('builds each one to its picture rather than to the same numbers', () => {
    const knight = sample('キャラクターA');
    const wizard = sample('キャラクターB');
    const scout = sample('キャラクターC');

    // The knight swings, the wizard thinks, the scout moves first.
    expect(statOf(knight, '筋力')).toBeGreaterThan(statOf(wizard, '筋力'));
    expect(statOf(wizard, '知力')).toBeGreaterThan(statOf(knight, '知力'));
    expect(statOf(scout, '敏捷度')).toBeGreaterThan(statOf(knight, '敏捷度'));
    expect(statOf(scout, '敏捷度')).toBeGreaterThan(statOf(wizard, '敏捷度'));
  });

  it('gives the pools that suit them', () => {
    expect(statOf(sample('キャラクターA'), 'HP')).toBeGreaterThan(statOf(sample('キャラクターB'), 'HP'));
    expect(statOf(sample('キャラクターB'), 'MP')).toBeGreaterThan(statOf(sample('キャラクターA'), 'MP'));
    expect(statOf(sample('モンスターC'), 'HP')).toBeGreaterThan(statOf(sample('モンスターA'), 'HP'));
  });

  it('leaves the golem slow and the goblins quick, which is the order a fight reads in', () => {
    expect(statOf(sample('モンスターC'), '敏捷度')).toBeLessThan(statOf(sample('モンスターA'), '敏捷度'));
  });

  it('gives two of a species the same speed and different flesh', () => {
    // Their order is left to the second sort, which is what a table sees on a tie.
    expect(statOf(sample('モンスターA'), '敏捷度')).toBe(statOf(sample('モンスターB'), '敏捷度'));
    expect(statOf(sample('モンスターA'), 'HP')).not.toBe(statOf(sample('モンスターB'), 'HP'));
  });

  it('starts everybody whole', () => {
    for (const name of ['キャラクターA', 'モンスターC']) {
      const pool = DataElement.findElementByReference(sample(name).rootDataElement!, 'HP')!;
      expect(Number(pool.currentValue)).toBe(Number(pool.value));
    }
  });
});
