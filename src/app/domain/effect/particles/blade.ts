import { clamp01, type ColorRamp, type EffectParticle } from '@axe/domain/effect/particles/shared';

/**
 * A blade.
 *
 * The sparks of a cut, and the cut face of a cleaving.
 */

/** A cut. The blade itself is drawn elsewhere; here are the flash of the landing and the scatter. */
export function emitSlash(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.22);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.55,
      size: base * (1 + flash * 1.6),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.9,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 26; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.2 + random() * 2.4);
    const born = random() * 0.14;
    const local = clamp01((progress - born) / 0.7);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.4));
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.55 + Math.sin(angle) * travel * 0.7 + base * 1.4 * local * local,
      size: base * 0.1 * (1 - local * 0.35),
      angle,
      stretch: 4 + local * 4,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * 0.95,
      shape: 'streak',
    });
  }
}

/** A cleaving: blood from the cut face, and fragments sliding the way the stroke went. */
export function emitBisect(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const cut = clamp01(progress / 0.22);
  if (cut < 1) return;

  const after = clamp01((progress - 0.22) / 0.78);
  const life = after > 0.6 ? 1 - (after - 0.6) / 0.4 : 1;

  for (let index = 0; index < 30; index++) {
    const along = random() - 0.5;
    const local = clamp01(after * (0.6 + random() * 0.9));
    // It spurts along the face and falls.
    const spread = base * along * 2.2;
    particles.push({
      x: spread + Math.cos(along * 6) * base * 0.3 * local,
      y: -base * (0.9 + along * 0.5) + base * local * local * 3,
      size: base * (0.07 + random() * 0.09),
      angle: -0.5,
      stretch: 2 + local * 3,
      color: random() < 0.25 ? ramp.hot : ramp.cool,
      alpha: life * (1 - local * 0.6) * 0.9,
      shape: local < 0.5 ? 'streak' : 'chunk',
    });
  }
}
