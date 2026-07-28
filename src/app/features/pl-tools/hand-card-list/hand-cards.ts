import { Card } from '@axe/domain/card/card';
import { GRAVEYARD_LOCATION } from '@axe/features/pl-tools/owned-character-list/owned-characters';

export function isHandCardOf(card: Card, userId: string): boolean {
  if (userId.length === 0) return false;
  if (card.owner !== userId) return false;
  return card.location.name !== GRAVEYARD_LOCATION;
}

export function selectHandCards(cards: readonly Card[], userId: string): Card[] {
  return cards.filter((card) => isHandCardOf(card, userId));
}
