import { seededRandom } from '@axe/core/util/seeded-random';

const GRADIENT_SIZE = 256;
const MASK = GRADIENT_SIZE - 1;

export interface ValueNoise {
  at(x: number, y: number): number;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Value noise on a lattice, which is what gives open ground its shape.
 *
 * White noise per cell gives static, and static is not a landscape. Reading a coarse
 * lattice and easing between its corners gives hills and hollows of a chosen size.
 */
export function makeValueNoise(seed: number): ValueNoise {
  const rng = seededRandom(seed);
  const values = new Float64Array(GRADIENT_SIZE * GRADIENT_SIZE);
  for (let i = 0; i < values.length; i++) values[i] = rng();

  const corner = (cx: number, cy: number) => values[(cy & MASK) * GRADIENT_SIZE + (cx & MASK)];

  return {
    at(x: number, y: number): number {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = smooth(x - x0);
      const fy = smooth(y - y0);
      const top = corner(x0, y0) * (1 - fx) + corner(x0 + 1, y0) * fx;
      const bottom = corner(x0, y0 + 1) * (1 - fx) + corner(x0 + 1, y0 + 1) * fx;
      return top * (1 - fy) + bottom * fy;
    },
  };
}

/**
 * Several octaves of the same noise, each half the size and half the weight of the last.
 *
 * One octave alone is too smooth to read as ground: rolling hills with no detail on them.
 * Too many and the smallest is finer than a cell, which is static rather than detail.
 */
export function fbm(noise: ValueNoise, x: number, y: number, octaves: number): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise.at(x * frequency, y * frequency) * amplitude;
    sum += amplitude;
    amplitude /= 2;
    frequency *= 2;
  }
  return sum > 0 ? total / sum : 0;
}

/**
 * The same noise, read at a place the noise itself has moved.
 *
 * Read straight, octaves of noise give rounded blobs one inside the next, like the rings on
 * a contour map, and ground made of those reads as a rash rather than as country. Displacing
 * where each point is read by another sample of noise pulls those rings into the folds,
 * peninsulas and inlets that ground actually has - domain warping, after Inigo Quilez.
 */
export function warpedFbm(
  land: ValueNoise,
  drift: ValueNoise,
  x: number,
  y: number,
  octaves: number,
  warp: number
): number {
  const dx = fbm(drift, x, y, 2) - 0.5;
  const dy = fbm(drift, x + 5.2, y + 1.3, 2) - 0.5;
  return fbm(land, x + warp * dx, y + warp * dy, octaves);
}
