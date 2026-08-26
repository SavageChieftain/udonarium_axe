import { seededRandom } from '@axe/core/util/seeded-random';
import { FIELD_PROP_SHAPES, FieldAtmosphere, FieldPropId } from '@axe/domain/tabletop/field/field-atmosphere';
import { fbm, makeValueNoise } from '@axe/domain/tabletop/field/field-noise';

export interface FieldLayout {
  width: number;
  height: number;
  /** Which band of ground each cell fell into. */
  ground: Uint8Array;
  /** What stands on each cell, or an empty string where nothing does. */
  props: (FieldPropId | '')[];
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

function bandFor(atmosphere: FieldAtmosphere, height: number): number {
  for (let index = 0; index < atmosphere.bands.length; index++) {
    if (height <= atmosphere.bands[index].upTo) return index;
  }
  return atmosphere.bands.length - 1;
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

  const land = makeValueNoise(seed);
  const growth = makeValueNoise(seed + 1013);
  const rng = seededRandom(seed + 7919);
  const ramp = RAMPS[Math.floor(rng() * RAMPS.length) % RAMPS.length];
  const gradient = atmosphere.gradient ?? 0;

  // Octaves of noise crowd around the middle, which would land almost every cell in one
  // band. Stretching the board's own range over the bands is what makes the ground vary.
  const raised = new Float64Array(width * height);
  let lowest = Infinity;
  let highest = -Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const noise = fbm(land, x / relief, y / relief, 4);
      const tilt = gradient > 0 ? ramp(x, y, width, height) : 0;
      const value = noise * (1 - gradient) + tilt * gradient;
      raised[y * width + x] = value;
      lowest = Math.min(lowest, value);
      highest = Math.max(highest, value);
    }
  }
  const span = highest - lowest || 1;
  for (let i = 0; i < raised.length; i++) ground[i] = bandFor(atmosphere, (raised[i] - lowest) / span);

  const scale = density / 50;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const band = ground[y * width + x];
      if (atmosphere.bands[band].bare) continue;
      if (crowded(props, width, height, x, y)) continue;

      // Growth clumps: a wood is thick in places and thin in others, never evenly sprinkled.
      const thickness = fbm(growth, x / 6, y / 6, 2);
      for (const plan of atmosphere.props) {
        if (!plan.bands.includes(band)) continue;
        const shape = FIELD_PROP_SHAPES[plan.prop];
        if (width - shape.span < x || height - shape.span < y) continue;
        if (rng() < plan.chance * scale * (0.4 + thickness)) {
          for (let dy = 0; dy < shape.span; dy++) {
            for (let dx = 0; dx < shape.span; dx++) props[(y + dy) * width + x + dx] = plan.prop;
          }
          break;
        }
      }
    }
  }

  return { width, height, ground, props };
}
