import { Card } from '@axe/domain/card/card';

export const JOKER_RANK = 'joker';

export type TrumpRank = number | typeof JOKER_RANK;

const TRUMP_CODE_PATTERN = /(?:^|\/)([cdhsx])(\d{2})\.[a-z]+$/i;

export function trumpCodeOf(card: Card): string | null {
  const source = frontImageSourceOf(card);
  const matched = TRUMP_CODE_PATTERN.exec(source);
  if (!matched) return null;
  return matched[1].toLowerCase() + matched[2];
}

function frontImageSourceOf(card: Card): string {
  const element = card.imageDataElement?.getFirstElementByName('front');
  const identifier = typeof element?.value === 'string' ? element.value : '';
  return identifier.length > 0 ? identifier : (card.frontImage?.url ?? '');
}

export function trumpRankOf(card: Card): TrumpRank | null {
  const code = trumpCodeOf(card);
  if (!code) return null;
  if (code.startsWith('x')) return JOKER_RANK;
  const rank = Number(code.slice(1));
  return rank >= 1 && rank <= 13 ? rank : null;
}

export function isJoker(card: Card): boolean {
  return trumpRankOf(card) === JOKER_RANK;
}

export function findTrumpPairs(cards: readonly Card[]): Card[][] {
  const byRank = new Map<number, Card[]>();
  for (const card of cards) {
    const rank = trumpRankOf(card);
    if (typeof rank !== 'number') continue;
    const bucket = byRank.get(rank);
    if (bucket) bucket.push(card);
    else byRank.set(rank, [card]);
  }

  const pairs: Card[][] = [];
  for (const bucket of byRank.values()) {
    for (let i = 0; i + 1 < bucket.length; i += 2) {
      pairs.push([bucket[i], bucket[i + 1]]);
    }
  }
  return pairs;
}

export function selectExtraJokers(cards: readonly Card[], keepCount = 1): Card[] {
  const jokers = cards.filter((card) => isJoker(card));
  return jokers.slice(Math.max(0, keepCount));
}
