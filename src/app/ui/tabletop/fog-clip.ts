export interface FogClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of a flat face that is left standing once the fog has covered the rest.
 *
 * A piece of terrain is one box however many cells it covers, and a box is drawn whole or not
 * at all, so ground the party has walked to and ground it has not used to be answered for
 * together: a wall gathered from a dozen cells appeared entire the moment one of its cells
 * was seen. Cutting the faces instead keeps the terrain in one piece and lets the fog lie
 * across it, which is what the fog does to everything else on the board.
 *
 * A path holds as many separate rectangles as it needs, which a polygon cannot.
 */
export function fogClipPath(rects: readonly FogClipRect[]): string | null {
  const kept = rects.filter((rect) => rect.width > 0 && rect.height > 0);
  if (kept.length === 0) return 'path("M 0 0 Z")';
  const parts = kept.map((rect) => {
    const right = round(rect.x + rect.width);
    const bottom = round(rect.y + rect.height);
    return `M ${round(rect.x)} ${round(rect.y)} H ${right} V ${bottom} H ${round(rect.x)} Z`;
  });
  return `path("${parts.join(' ')}")`;
}

/**
 * The runs of cleared cells along one row, as rectangles on the face they belong to.
 *
 * Given as runs rather than cell by cell because a face is usually cleared in stretches, and
 * a path with one rectangle per cell would say the same thing at a dozen times the length.
 */
export function fogClipRuns(cleared: readonly boolean[], cellWidth: number, y: number, height: number): FogClipRect[] {
  const rects: FogClipRect[] = [];
  let from = -1;
  for (let i = 0; i <= cleared.length; i++) {
    if (i < cleared.length && cleared[i]) {
      if (from < 0) from = i;
      continue;
    }
    if (from < 0) continue;
    rects.push({ x: from * cellWidth, y, width: (i - from) * cellWidth, height });
    from = -1;
  }
  return rects;
}

export function allCleared(cleared: readonly boolean[]): boolean {
  return cleared.every((cell) => cell);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
