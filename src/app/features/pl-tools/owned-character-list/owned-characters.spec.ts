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
    it('自分が所有するキャラを対象にする', () => {
      expect(isOwnedByUser(makeCharacter('me', 'table'), 'me')).toBe(true);
    });

    it('他人が所有するキャラは対象外', () => {
      expect(isOwnedByUser(makeCharacter('other', 'table'), 'me')).toBe(false);
    });

    it('未所有のキャラは対象外', () => {
      expect(isOwnedByUser(makeCharacter('', 'table'), 'me')).toBe(false);
    });

    it('墓場のキャラは所有していても対象外', () => {
      expect(isOwnedByUser(makeCharacter('me', 'graveyard'), 'me')).toBe(false);
    });

    it('userId が空なら何も対象にしない', () => {
      expect(isOwnedByUser(makeCharacter('', 'table'), '')).toBe(false);
    });
  });

  describe('selectOwnedCharacters', () => {
    it('自分の所有キャラだけを元の順序で返す', () => {
      const mine = makeCharacter('me', 'table');
      const others = makeCharacter('other', 'table');
      const buried = makeCharacter('me', 'graveyard');
      const alsoMine = makeCharacter('me', 'common');

      expect(selectOwnedCharacters([mine, others, buried, alsoMine], 'me')).toEqual([mine, alsoMine]);
    });
  });

  describe('isOnTable', () => {
    it('テーブル上のキャラだけ真', () => {
      expect(isOnTable(makeCharacter('me', 'table'))).toBe(true);
      expect(isOnTable(makeCharacter('me', 'common'))).toBe(false);
    });
  });
});
