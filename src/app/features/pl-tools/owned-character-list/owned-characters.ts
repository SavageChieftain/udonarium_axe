import { GameCharacter } from '@axe/domain/character/game-character';

export const GRAVEYARD_LOCATION = 'graveyard';

export function isOwnedByUser(character: GameCharacter, userId: string): boolean {
  if (userId.length === 0) return false;
  if (character.owner !== userId) return false;
  return character.location.name !== GRAVEYARD_LOCATION;
}

export function selectOwnedCharacters(characters: readonly GameCharacter[], userId: string): GameCharacter[] {
  return characters.filter((character) => isOwnedByUser(character, userId));
}

export function isOnTable(character: GameCharacter): boolean {
  return character.isVisibleOnTable;
}
