import { Card } from '@axe/domain/card/card';

export const CARD_OVERLAP_RADIUS_PX = 100;

export function selectOverlappingCards(
  cards: readonly Card[],
  origin: Card,
  radiusPx = CARD_OVERLAP_RADIUS_PX
): Card[] {
  return cards
    .filter((card) => {
      const distance =
        (card.location.x - origin.location.x) ** 2 +
        (card.location.y - origin.location.y) ** 2 +
        (card.posZ - origin.posZ) ** 2;
      return distance < radiusPx ** 2;
    })
    .sort((a, b) => b.zindex - a.zindex);
}
