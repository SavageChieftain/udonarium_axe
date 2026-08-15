/**
 * What an area attack takes in.
 *
 * It picks up by distance from the piece at the centre, nearest first.
 * That order is the order they fire in, so it spreads from the centre out.
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

/** Returns the pieces within the radius, nearest first, with the one at the centre always at the front. */
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
