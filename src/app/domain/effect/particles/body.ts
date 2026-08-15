import { clamp01, type ColorRamp, easeOutQuad, type EffectParticle } from '@axe/domain/effect/particles/shared';

/**
 * What happens to the piece itself.
 *
 * The particles of a crumbling, and the blood of a spurt.
 */

/**
 * Crumbling: the piece breaks, rises as particles and is gone.
 *
 * It goes from the bottom up; all at once it could not be told from an explosion.
 */
export function emitDissolve(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = progress > 0.72 ? 1 - (progress - 0.72) / 0.28 : 1;

  for (let index = 0; index < 54; index++) {
    const column = random();
    const row = random();
    // The lower fragments go first.
    const born = row * 0.45;
    const local = clamp01((progress - born) / 0.55);
    if (local <= 0) continue;

    const rise = easeOutQuad(local);
    const drift = Math.sin(column * Math.PI * 4 + local * 3.4) * base * 0.35 * local;
    particles.push({
      x: (column - 0.5) * base * 1.5 * (1 - local * 0.25) + drift,
      y: -base * (0.2 + row * 1.6) - base * rise * 2.4,
      size: base * (0.12 + random() * 0.1) * (1 - local * 0.55),
      angle: column * 6,
      stretch: 1 + local * 1.6,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: life * (1 - local) * 0.95,
      shape: local < 0.35 ? 'chunk' : 'glow',
    });
  }
}

/**
 * The blood: the flying drops, which fall and scatter.
 *
 * Scattered evenly it is mist. Mixing the sizes, drawing the faster drops out into tails
 * and letting them lose speed as they fall is what reads as liquid.
 */
export function emitGore(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = progress > 0.5 ? 1 - (progress - 0.5) / 0.5 : 1;

  for (let index = 0; index < 44; index++) {
    // It leans the way the stroke passed, up and across, and none of it flies straight down.
    const angle = -Math.PI * 0.95 + random() * Math.PI * 1.15;
    const heavy = random();
    const speed = 0.5 + heavy * heavy * 2.2;
    const local = clamp01(progress / 0.5 + random() * 0.2);
    const travel = base * speed * easeOutQuad(local) * 2;
    const fall = base * local * local * (2.2 + heavy * 1.8);
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.95 + Math.sin(angle) * travel * 0.75 + fall,
      size: base * (0.05 + heavy * heavy * 0.16),
      angle: angle + fall * 0.02,
      // The faster a drop, the longer its tail; by the time it lands it is round again.
      stretch: 1 + (1 - local) * speed * 2.4,
      color: heavy > 0.75 ? ramp.hot : ramp.cool,
      alpha: life * (1 - local * 0.45),
      shape: local < 0.55 ? 'streak' : 'chunk',
    });
  }

  // The fine mist at the wound, thin and close about it.
  for (let index = 0; index < 14; index++) {
    const angle = random() * Math.PI * 2;
    const local = clamp01(progress / 0.3 + random() * 0.3);
    const travel = base * (0.2 + random() * 0.7) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.95 + Math.sin(angle) * travel * 0.6 + base * local * 0.6,
      size: base * 0.035,
      angle,
      stretch: 1,
      color: ramp.cool,
      alpha: life * (1 - local) * 0.6,
      shape: 'chunk',
    });
  }
}
