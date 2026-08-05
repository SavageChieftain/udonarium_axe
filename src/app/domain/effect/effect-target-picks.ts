/**
 * 順序付きの対象選択。
 *
 * 並び順がそのまま演出の発動順（`staggerMs` の順番）になるので、
 * 真実の源は「選んだ順の配列」で、コマ側の `targeted` はそれを写しただけのものになる。
 */

/** 選び直し。選択済みならは外し、未選択なら末尾へ足す。 */
export function toggleEffectPick(picks: readonly string[], identifier: string, limit: number): string[] {
  if (identifier.length < 1) return [...picks];

  const index = picks.indexOf(identifier);
  if (index >= 0) return [...picks.slice(0, index), ...picks.slice(index + 1)];

  const capacity = Math.max(limit, 1);
  // 上限に達していたら古いほうから押し出す。単体対象では「選び直し」になり、
  // 上限で詰まったまま何も選べない状態にならない。
  const kept = picks.length < capacity ? [...picks] : picks.slice(picks.length - capacity + 1);
  return [...kept, identifier];
}

/** 選んだ順番(1 始まり)。未選択なら 0。 */
export function effectPickOrder(picks: readonly string[], identifier: string): number {
  return picks.indexOf(identifier) + 1;
}

/**
 * この選択で上限に届いたか。
 *
 * 届いた瞬間に発動したいが、はじめから埋まっている状態での選び直しでは発動させない。
 */
export function reachedEffectPickLimit(before: readonly string[], after: readonly string[], limit: number): boolean {
  const capacity = Math.max(limit, 1);
  return before.length < capacity && after.length >= capacity;
}
