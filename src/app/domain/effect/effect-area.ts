/**
 * 範囲攻撃の巻き込み判定。
 *
 * 中心に選んだコマからの距離で拾い、近い順に並べる。
 * 並び順がそのまま発動順になるので、中心から外へ広がって見える。
 */

export interface EffectAreaCandidate {
  identifier: string;
  x: number;
  y: number;
}

export interface EffectAreaPoint {
  x: number;
  y: number;
}

/** 中心から半径内のコマを近い順に返す。中心のコマ自身は必ず先頭に来る。 */
export function effectAreaTargets(
  center: EffectAreaPoint,
  candidates: readonly EffectAreaCandidate[],
  radius: number,
  limit: number
): string[] {
  if (!Number.isFinite(radius) || radius <= 0) return [];

  const withDistance = candidates
    .map((candidate) => ({
      identifier: candidate.identifier,
      distance: Math.hypot(candidate.x - center.x, candidate.y - center.y),
    }))
    .filter((entry) => entry.distance <= radius);

  withDistance.sort((left, right) => left.distance - right.distance);
  return withDistance.slice(0, Math.max(limit, 1)).map((entry) => entry.identifier);
}
