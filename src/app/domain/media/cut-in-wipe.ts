/**
 * A layer let in a part at a time.
 *
 * Growing a shape from one side squashes the whole of it into the space it has so far.
 * A wipe hides what has not arrived instead, so a tear can run along like a zip being
 * pulled: the point races ahead down the middle and the gap widens behind it.
 *
 * It is a second outline over the one the layer is already cut to, so the two are kept
 * apart — the shape says what the layer is, the wipe says how much of it has happened.
 */

export const CUT_IN_WIPES = ['none', 'right', 'left', 'down', 'up', 'chevronRight', 'chevronLeft'] as const;
export type CutInWipe = (typeof CUT_IN_WIPES)[number];

export type WipePoint = readonly [number, number];

/** How far ahead of the edge the point of a chevron runs, as a fraction of the width. */
export const CHEVRON_LEAD = 0.13;

export function isCutInWipe(value: unknown): value is CutInWipe {
  return typeof value === 'string' && (CUT_IN_WIPES as readonly string[]).includes(value);
}

/** How much of the layer has been let in, held between none of it and all of it. */
export function wipeAmount(amount: number): number {
  if (!Number.isFinite(amount)) return 1;
  return Math.min(1, Math.max(0, amount));
}

/**
 * The outline of what has been let in so far.
 *
 * The number of corners never changes with the amount, so a browser can travel from one
 * to the next rather than jumping between them.
 */
export function wipePoints(wipe: CutInWipe, amount: number): readonly WipePoint[] {
  const at = wipeAmount(amount);

  switch (wipe) {
    case 'right':
      return [
        [0, 0],
        [at, 0],
        [at, 1],
        [0, 1],
      ];
    case 'left':
      return [
        [1, 0],
        [1 - at, 0],
        [1 - at, 1],
        [1, 1],
      ];
    case 'down':
      return [
        [0, 0],
        [1, 0],
        [1, at],
        [0, at],
      ];
    case 'up':
      return [
        [0, 1],
        [1, 1],
        [1, 1 - at],
        [0, 1 - at],
      ];
    case 'chevronRight':
      return [
        [0, 0],
        [at, 0],
        [Math.min(1, at + CHEVRON_LEAD), 0.5],
        [at, 1],
        [0, 1],
      ];
    case 'chevronLeft':
      return [
        [1, 0],
        [1 - at, 0],
        [Math.max(0, 1 - at - CHEVRON_LEAD), 0.5],
        [1 - at, 1],
        [1, 1],
      ];
    default:
      return [];
  }
}

/** What the browser is told, or nothing at all where the whole layer is let in at once. */
export function wipeCss(wipe: CutInWipe, amount: number): string {
  if (wipe === 'none') return '';

  const corners = wipePoints(wipe, amount).map(([x, y]) => `${round(x * 100)}% ${round(y * 100)}%`);
  return `polygon(${corners.join(', ')})`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
