/**
 * How a band layer is painted.
 *
 * One place decides the CSS, so the editor's preview, the playing window and the video
 * export cannot drift apart on what a band is supposed to look like.
 */

export const CUT_IN_FILL_SHAPES = ['linear', 'radial', 'conic', 'stripes'] as const;
export type CutInFillShape = (typeof CUT_IN_FILL_SHAPES)[number];

/** How wide one band of a striped fill is, in the cut-in's own coordinates. */
export const STRIPE_WIDTH_PX = 24;

export interface CutInFill {
  shape: CutInFillShape;
  from: string;
  /** A colour passed through on the way. Empty for a straight run from one to the other. */
  mid: string;
  /** Empty for one flat colour, whatever the shape says. */
  to: string;
  angleDeg: number;
}

export function isCutInFillShape(value: unknown): value is CutInFillShape {
  return typeof value === 'string' && (CUT_IN_FILL_SHAPES as readonly string[]).includes(value);
}

/** The colours a fill runs through, in order. */
export function fillStops(fill: CutInFill): string[] {
  return [fill.from, fill.mid, fill.to].filter((colour) => colour.length > 0);
}

export function fillCss(fill: CutInFill): string {
  const stops = fillStops(fill);
  if (stops.length < 2) return stops[0] ?? 'transparent';

  const angle = Number.isFinite(fill.angleDeg) ? fill.angleDeg : 90;
  const list = stops.join(', ');

  switch (fill.shape) {
    case 'radial':
      return `radial-gradient(circle at 50% 50%, ${list})`;
    case 'conic':
      return `conic-gradient(from ${angle}deg at 50% 50%, ${list}, ${stops[0]})`;
    case 'stripes':
      return `repeating-linear-gradient(${angle}deg, ${stripeStops(stops)})`;
    default:
      return `linear-gradient(${angle}deg, ${list})`;
  }
}

/** Hard-edged bands rather than a run of colour, which is what makes stripes stripes. */
function stripeStops(stops: readonly string[]): string {
  const written: string[] = [];
  for (const [at, colour] of stops.entries()) {
    written.push(`${colour} ${at * STRIPE_WIDTH_PX}px`, `${colour} ${(at + 1) * STRIPE_WIDTH_PX}px`);
  }
  return written.join(', ');
}
