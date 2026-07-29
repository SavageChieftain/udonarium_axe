import { Card } from '@axe/domain/card/card';
import { isHandOf } from '@axe/domain/card/hand-location';

export function isHandCardOf(card: Card, userId: string): boolean {
  return isHandOf(card.location.name, userId);
}

export function selectHandCards(cards: readonly Card[], userId: string): Card[] {
  return cards.filter((card) => isHandCardOf(card, userId)).sort((a, b) => a.handOrder - b.handOrder);
}

export function reorderHandCards(cards: readonly Card[], from: number, insertAt: number): Card[] {
  if (from < 0 || from >= cards.length) return [...cards];

  const next = [...cards];
  const [moved] = next.splice(from, 1);
  const target = insertAt > from ? insertAt - 1 : insertAt;
  next.splice(Math.max(0, Math.min(next.length, target)), 0, moved);

  return next;
}
