import { GameCharacter } from '@axe/domain/character/game-character';
import {
  isControllableByUser,
  isOnTable,
  isOwnedByUser,
  selectControllableCharacters,
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
  afterEach(() => {});

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

  describe('isControllableByUser', () => {
    it('takes your own piece and one nobody has claimed', () => {
      expect(isControllableByUser(makeCharacter('me', 'table'), 'me')).toBe(true);
      expect(isControllableByUser(makeCharacter('', 'table'), 'me')).toBe(true);
    });

    it('leaves the piece of another, and anything buried, alone', () => {
      expect(isControllableByUser(makeCharacter('other', 'table'), 'me')).toBe(false);
      expect(isControllableByUser(makeCharacter('', 'graveyard'), 'me')).toBe(false);
      expect(isControllableByUser(makeCharacter('me', 'graveyard'), 'me')).toBe(false);
    });

    it('still offers an unclaimed piece to someone the room does not know yet', () => {
      expect(isControllableByUser(makeCharacter('', 'table'), '')).toBe(true);
      expect(isControllableByUser(makeCharacter('me', 'table'), '')).toBe(false);
    });
  });

  describe('selectControllableCharacters', () => {
    it('keeps yours and the unclaimed, in the order they were in', () => {
      const mine = makeCharacter('me', 'table');
      const unclaimed = makeCharacter('', 'table');
      const theirs = makeCharacter('other', 'table');
      const buried = makeCharacter('', 'graveyard');

      expect(selectControllableCharacters([mine, unclaimed, theirs, buried], 'me')).toEqual([mine, unclaimed]);
    });
  });

  describe('isOnTable', () => {
    it('is true only for one on the table', () => {
      expect(isOnTable(makeCharacter('me', 'table'))).toBe(true);
      expect(isOnTable(makeCharacter('me', 'common'))).toBe(false);
    });
  });
});
