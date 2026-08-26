import { seededRandom } from '@axe/core/util/seeded-random';
import { FIELD_PROP_SHAPES, FieldAtmosphere, FieldPropId } from '@axe/domain/tabletop/field/field-atmosphere';
import { makeValueNoise, warpedFbm } from '@axe/domain/tabletop/field/field-noise';

export interface FieldLayout {
  width: number;
  height: number;
  /** Which band of ground each cell fell into. */
  ground: Uint8Array;
  /** What stands on each cell, or an empty string where nothing does. */
  props: (FieldPropId | '')[];
  /** The trees, each one a place rather than a cell, since a tree is wider than it is rooted. */
  trees: FieldTree[];
}

/** A tree: where its trunk stands, how wide its crown is, and how high it carries it. */
export interface FieldTree {
  x: number;
  y: number;
  span: number;
  /** How far above the standing height this one holds its crown. No two woods are level. */
  lift: number;
}

export function bandAt(layout: FieldLayout, x: number, y: number): number {
  if (x < 0 || y < 0 || layout.width <= x || layout.height <= y) return 0;
  return layout.ground[y * layout.width + x];
}

export function propAt(layout: FieldLayout, x: number, y: number): FieldPropId | '' {
  if (x < 0 || y < 0 || layout.width <= x || layout.height <= y) return '';
  return layout.props[y * layout.width + x];
}

/** The four ways the ground can be tilted so that the low band gathers along one side. */
const RAMPS: readonly ((x: number, y: number, w: number, h: number) => number)[] = [
  (x, _y, w) => x / (w - 1),
  (x, _y, w) => 1 - x / (w - 1),
  (_x, y, _w, h) => y / (h - 1),
  (_x, y, _w, h) => 1 - y / (h - 1),
];

/** How many neighbours may already be taken before a cell is left clear, so ground stays open. */
const CROWD_LIMIT = 2;

/**
 * How the height field is read.
 *
 * Three octaves at this relief put the smallest fold at about three cells across; a fourth
 * would be finer than a cell, which is the static that made open ground read as a rash.
 */
const OCTAVES = 3;
/** How far a point is displaced before the height is read there, in lattice units. */
const WARP = 0.6;
/** How near two trunks may stand, in cells. Nearer and the crowns are one lid over both. */
const TREE_SPACING = 3;

/** Below this share of the growth field nothing grows, and above it the stand thickens. */
const GROWTH_FLOOR = 0.3;
const GROWTH_GAIN = 2.4;

function bandFor(height: number, cuts: number[]): number {
  for (let i = 0; i < cuts.length; i++) {
    if (height <= cuts[i]) return i;
  }
  return cuts.length - 1;
}

/**
 * Puts the trees in, as trees rather than as a cell each.
 *
 * A tree is a trunk with a crown several times its width standing clear above it, so one to
 * a cell can only ever be a post with a lid. They are placed as whole things instead, no two
 * closer than a crown apart, which is what leaves the trunks visible under the canopy.
 */
function plantTrees(
  atmosphere: FieldAtmosphere,
  ground: Uint8Array,
  props: (FieldPropId | '')[],
  trees: FieldTree[],
  width: number,
  height: number,
  growthField: Float64Array,
  thinnest: number,
  growthSpan: number,
  rng: () => number,
  scale: number
): void {
  const plans = atmosphere.props.filter((entry) => entry.prop === 'tree');
  if (plans.length === 0 || scale <= 0) return;
  const span = FIELD_PROP_SHAPES.tree.span;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (props[index]) continue;
      // A wood is thicker on the ground that suits it, so each band names its own thickness.
      const plan = plans.find((entry) => entry.bands.includes(ground[index]));
      if (!plan) continue;
      if (atmosphere.bands[ground[index]].bare) continue;

      const thickness = (growthField[index] - thinnest) / growthSpan;
      const clump = thickness <= GROWTH_FLOOR ? 0 : ((thickness - GROWTH_FLOOR) / (1 - GROWTH_FLOOR)) * GROWTH_GAIN;
      if (rng() >= plan.chance * scale * clump) continue;
      if (trees.some((tree) => Math.abs(tree.x - x) < TREE_SPACING && Math.abs(tree.y - y) < TREE_SPACING)) continue;
      // A crown of its own width and height keeps two neighbours from sharing a face, which
      // would flicker where they met, and a wood of one height reads as a hedge trimmed flat.
      // Odd widths only: an even crown cannot be centred on the cell its trunk stands in.
      const grown = rng() < 0.3 ? span - 2 : span;
      const reachOf = (grown - 1) / 2;
      if (x - reachOf < 0 || y - reachOf < 0 || width <= x + reachOf || height <= y + reachOf) continue;

      trees.push({ x, y, span: grown, lift: Math.round(rng() * 6) / 10 });
      props[index] = 'tree';
    }
  }
}

/** The heights at which each band gives way to the next, so that each gets the share it asked for. */
function quantileCuts(heights: Float64Array, shares: readonly number[]): number[] {
  const sorted = Float64Array.from(heights).sort();
  return shares.map((share) => {
    const at = Math.min(sorted.length - 1, Math.max(0, Math.round(share * sorted.length) - 1));
    return sorted[at];
  });
}

/** Whether the whole footprint stands on ground that will take it, and on nothing else. */
function fits(
  atmosphere: FieldAtmosphere,
  ground: Uint8Array,
  props: (FieldPropId | '')[],
  width: number,
  height: number,
  x: number,
  y: number,
  span: number
): boolean {
  if (width - span < x || height - span < y) return false;
  for (let dy = 0; dy < span; dy++) {
    for (let dx = 0; dx < span; dx++) {
      const index = (y + dy) * width + x + dx;
      if (props[index]) return false;
      if (atmosphere.bands[ground[index]].bare) return false;
    }
  }
  return true;
}

function crowded(props: (FieldPropId | '')[], width: number, height: number, x: number, y: number): boolean {
  let taken = 0;
  if (0 < x && props[y * width + x - 1]) taken++;
  if (x < width - 1 && props[y * width + x + 1]) taken++;
  if (0 < y && props[(y - 1) * width + x]) taken++;
  if (y < height - 1 && props[(y + 1) * width + x]) taken++;
  return CROWD_LIMIT <= taken;
}

/**
 * Lays out open ground: what it is made of, and what grows on it.
 *
 * Height decides the ground, a second noise decides where things grow thickest, and a
 * neighbour count keeps a wood from closing into a wall nobody can walk through.
 */
export function generateField(
  atmosphere: FieldAtmosphere,
  width: number,
  height: number,
  seed: number,
  density: number
): FieldLayout {
  const relief = Math.max(1, atmosphere.relief);
  const ground = new Uint8Array(width * height);
  const props: (FieldPropId | '')[] = new Array(width * height).fill('');
  const trees: FieldTree[] = [];

  const land = makeValueNoise(seed);
  const drift = makeValueNoise(seed + 4409);
  const damp = makeValueNoise(seed + 2237);
  const growth = makeValueNoise(seed + 1013);
  const rng = seededRandom(seed + 7919);
  const ramp = RAMPS[Math.floor(rng() * RAMPS.length) % RAMPS.length];
  const gradient = atmosphere.gradient ?? 0;

  const raised = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const noise = warpedFbm(land, drift, x / relief, y / relief, OCTAVES, WARP);
      const tilt = gradient > 0 ? ramp(x, y, width, height) : 0;
      // Moisture is mixed in before the bands are cut rather than shifting a cell across one
      // afterwards: a hollow that holds water is lower ground as far as what grows there is
      // concerned, and folding it in here is what keeps each band to the share it asked for.
      const wetness = warpedFbm(damp, drift, x / (relief * 1.6), y / (relief * 1.6), 2, WARP);
      const height01 = noise * (1 - gradient) + tilt * gradient;
      raised[y * width + x] = height01 + (wetness - 0.5) * atmosphere.damp;
    }
  }
  // Where each band starts is read off the board rather than set against the raw height: a
  // preset says how much of its ground is water or wood, and gets that much of it whatever
  // this particular board's noise happened to do.
  const cuts = quantileCuts(
    raised,
    atmosphere.bands.map((band) => band.upTo)
  );
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      ground[index] = bandFor(raised[index], cuts);
    }
  }

  // Levelled over the board, the same way the height is, so that the bare places are as bare
  // and the thick places as thick whatever this particular board's noise happened to span.
  const growthField = new Float64Array(width * height);
  let thinnest = Infinity;
  let thickest = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = warpedFbm(growth, drift, x / (relief * 0.7), y / (relief * 0.7), 2, WARP);
      growthField[y * width + x] = value;
      thinnest = Math.min(thinnest, value);
      thickest = Math.max(thickest, value);
    }
  }
  const growthSpan = thickest - thinnest || 1;

  const scale = density / 50;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const band = ground[y * width + x];
      if (atmosphere.bands[band].bare) continue;
      if (crowded(props, width, height, x, y)) continue;

      // A wood is thick in places and thin in others, never evenly sprinkled, and the patches
      // it comes in are the size of the ground's own folds. Squaring it empties the thin parts
      // rather than dusting them, which is what makes a stand of trees read as a stand.
      const thickness = (growthField[y * width + x] - thinnest) / growthSpan;
      // Below the line nothing grows at all, which is what leaves clearings between the stands.
      const clump = thickness <= GROWTH_FLOOR ? 0 : ((thickness - GROWTH_FLOOR) / (1 - GROWTH_FLOOR)) * GROWTH_GAIN;
      for (const plan of atmosphere.props) {
        if (plan.prop === 'tree') continue;
        if (!plan.bands.includes(band)) continue;
        const shape = FIELD_PROP_SHAPES[plan.prop];
        if (!fits(atmosphere, ground, props, width, height, x, y, shape.span)) continue;
        if (rng() < plan.chance * scale * clump) {
          for (let dy = 0; dy < shape.span; dy++) {
            for (let dx = 0; dx < shape.span; dx++) props[(y + dy) * width + x + dx] = plan.prop;
          }
          break;
        }
      }
    }
  }

  plantTrees(atmosphere, ground, props, trees, width, height, growthField, thinnest, growthSpan, rng, scale);

  return { width, height, ground, props, trees };
}
