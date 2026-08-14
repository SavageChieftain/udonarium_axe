import { ObjectStore } from '@axe/core/sync/object-store';
import { GameCharacter } from '@axe/domain/character/game-character';
import {
  isOnTable,
  isOwnedByUser,
  selectOwnedCharacters,
} from '@axe/features/pl-tools/owned-character-list/owned-characters';
import { afterEach, describe, expect, it } from 'vitest';

function makeCharacter(owner: string, locationName: string): GameCharacter {
  const character = GameCharacter.create('テストキャラ', 1, '');
  character.owner = owner;
  character.location.name = locationName;
  return character;
}

describe('owned-characters', () => {
  afterEach(() => {
    const store = ObjectStore.instance;
    store.getObjects().forEach((object) => store.delete(object, false));
    store.clearDeleteHistory();
  });

  describe('isOwnedByUser', () => {
    it('works on a character you own', () => {
      expect(isOwnedByUser(makeCharacter('me', 'table'), 'me')).toBe(true);
    });

    it('leaves somebody elses alone', () => {
      expect(isOwnedByUser(makeCharacter('other', 'table'), 'me')).toBe(false);
    });

    it('leaves an unowned one alone', () => {
      expect(isOwnedByUser(makeCharacter('', 'table'), 'me')).toBe(false);
    });

    it('leaves one in the graveyard alone, owned or not', () => {
      expect(isOwnedByUser(makeCharacter('me', 'graveyard'), 'me')).toBe(false);
    });

    it('works on nothing without a user', () => {
      expect(isOwnedByUser(makeCharacter('', 'table'), '')).toBe(false);
    });
  });

  describe('selectOwnedCharacters', () => {
    it('returns the characters you own, in the order they were in', () => {
      const mine = makeCharacter('me', 'table');
      const others = makeCharacter('other', 'table');
      const buried = makeCharacter('me', 'graveyard');
      const alsoMine = makeCharacter('me', 'common');

      expect(selectOwnedCharacters([mine, others, buried, alsoMine], 'me')).toEqual([mine, alsoMine]);
    });
  });

  describe('isOnTable', () => {
    it('is true only for one on the table', () => {
      expect(isOnTable(makeCharacter('me', 'table'))).toBe(true);
      expect(isOnTable(makeCharacter('me', 'common'))).toBe(false);
    });
  });
});
