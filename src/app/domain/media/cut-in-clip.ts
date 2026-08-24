/**
 * The outline a layer is cut down to.
 *
 * A cut-in window is rarely a plain rectangle: it leans, or it has a torn edge, or it
 * bursts. None of that can be drawn with a box, so a layer carries a shape and every
 * corner of it is written here once, as fractions of the layer's own box. The browser is
 * handed the same figures as a clip-path that the video export is handed as a path.
 */

export const CUT_IN_CLIPS = [
  'none',
  'slant',
  'slantBack',
  'torn',
  'tornLeft',
  'burst',
  'star',
  'chevron',
  'circle',
] as const;
export type CutInClip = (typeof CUT_IN_CLIPS)[number];

export type ClipPoint = readonly [number, number];

export function isCutInClip(value: unknown): value is CutInClip {
  return typeof value === 'string' && (CUT_IN_CLIPS as readonly string[]).includes(value);
}

/** How far a leaning window's top edge is pushed across, as a fraction of its width. */
const LEAN = 0.14;
/** How deep the teeth of a torn edge bite, and how many there are. */
const TEAR = 0.045;
const TEETH = 9;

const SHAPES: Record<Exclude<CutInClip, 'none' | 'circle'>, readonly ClipPoint[]> = {
  slant: [
    [LEAN, 0],
    [1, 0],
    [1 - LEAN, 1],
    [0, 1],
  ],
  slantBack: [
    [0, 0],
    [1 - LEAN, 0],
    [1, 1],
    [LEAN, 1],
  ],
  torn: tornOutline(true, true),
  tornLeft: tornOutline(true, false),
  burst: burstOutline(),
  star: starOutline(),
  chevron: [
    [0, 0],
    [0.82, 0],
    [1, 0.5],
    [0.82, 1],
    [0, 1],
    [0.18, 0.5],
  ],
};

/** The corners of a shape, or none where the layer keeps its own box. */
export function clipPoints(clip: CutInClip): readonly ClipPoint[] {
  if (clip === 'none' || clip === 'circle') return [];
  return SHAPES[clip];
}

/** What the browser is told, or nothing at all where the layer keeps its own box. */
export function clipCss(clip: CutInClip): string {
  if (clip === 'none') return '';
  if (clip === 'circle') return 'ellipse(50% 50% at 50% 50%)';

  const corners = clipPoints(clip).map(([x, y]) => `${round(x * 100)}% ${round(y * 100)}%`);
  return `polygon(${corners.join(', ')})`;
}

/**
 * An edge bitten into teeth.
 *
 * The teeth are laid out from a fixed pattern rather than drawn at random, so every
 * screen in the room tears the same way and a saved room tears the way it was saved.
 */
function tornOutline(right: boolean, left: boolean): readonly ClipPoint[] {
  const bites = [0.6, 1, 0.35, 0.85, 0.15, 0.7, 1, 0.45, 0.9];
  const points: ClipPoint[] = [[0, 0]];

  points.push([1, 0]);
  if (right) {
    for (let tooth = 1; tooth < TEETH; tooth++) {
      const along = tooth / TEETH;
      points.push([1 - TEAR * bites[tooth % bites.length], along - 0.5 / TEETH]);
      points.push([1, along]);
    }
  }
  points.push([1, 1]);
  points.push([0, 1]);
  if (left) {
    for (let tooth = TEETH - 1; tooth > 0; tooth--) {
      const along = tooth / TEETH;
      points.push([TEAR * bites[(tooth + 3) % bites.length], along + 0.5 / TEETH]);
      points.push([0, along]);
    }
  }
  return points;
}

function burstOutline(): readonly ClipPoint[] {
  const spikes = 14;
  const reach = [1, 0.74, 0.94, 0.7, 1, 0.78, 0.9];
  const points: ClipPoint[] = [];

  for (let spike = 0; spike < spikes * 2; spike++) {
    const angle = (spike / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const out = spike % 2 === 0 ? reach[(spike / 2) % reach.length] : 0.52;
    points.push([0.5 + (Math.cos(angle) * out) / 2, 0.5 + (Math.sin(angle) * out) / 2]);
  }
  return points;
}

function starOutline(): readonly ClipPoint[] {
  const points: ClipPoint[] = [];
  for (let corner = 0; corner < 10; corner++) {
    const angle = (corner / 10) * Math.PI * 2 - Math.PI / 2;
    const out = corner % 2 === 0 ? 1 : 0.42;
    points.push([0.5 + (Math.cos(angle) * out) / 2, 0.5 + (Math.sin(angle) * out) / 2]);
  }
  return points;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
