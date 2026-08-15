export interface DealPlan {
  /** How many each player is dealt, in the order the players come. */
  counts: number[];
  /** Which cards each player is dealt, by their place in the deck. */
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
