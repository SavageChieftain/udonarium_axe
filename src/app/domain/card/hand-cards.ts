import { Card } from '@axe/domain/card/card';
import { isHandOf } from '@axe/domain/card/hand-location';

export function isHandCardOf(card: Card, userId: string): boolean {
  return isHandOf(card.location.name, userId);
}

export function selectHandCardsOf(cards: readonly Card[], userId: string): Card[] {
  return cards.filter((card) => isHandCardOf(card, userId)).sort((a, b) => a.handOrder - b.handOrder);
}
