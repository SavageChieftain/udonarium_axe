import { Card } from '@axe/domain/card/card';
import { isHandCardOf, selectHandCardsOf } from '@axe/domain/card/hand-cards';

export { isHandCardOf };

export function selectHandCards(cards: readonly Card[], userId: string): Card[] {
  return selectHandCardsOf(cards, userId);
}

export function reorderHandCards(cards: readonly Card[], from: number, insertAt: number): Card[] {
  if (from < 0 || from >= cards.length) return [...cards];

  const next = [...cards];
  const [moved] = next.splice(from, 1);
  const target = insertAt > from ? insertAt - 1 : insertAt;
  next.splice(Math.max(0, Math.min(next.length, target)), 0, moved);

  return next;
}
