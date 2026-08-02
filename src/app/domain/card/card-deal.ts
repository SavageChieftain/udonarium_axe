export interface DealPlan {
  /** 参加者ごとの配布枚数。参加者の並び順に対応する。 */
  counts: number[];
  /** 参加者ごとに配るカードの位置（配列の先頭から数えた添字）。 */
  indexes: number[][];
}

export function planDeal(cardCount: number, participantCount: number): DealPlan {
  if (participantCount < 1 || cardCount < 1) {
    return { counts: new Array(Math.max(0, participantCount)).fill(0), indexes: [] };
  }

  const counts = new Array(participantCount).fill(0);
  const indexes: number[][] = Array.from({ length: participantCount }, () => []);
  for (let index = 0; index < cardCount; index++) {
    const seat = index % participantCount;
    counts[seat] += 1;
    indexes[seat].push(index);
  }
  return { counts, indexes };
}
