import { clamp01, type ColorRamp, easeOutQuad, type EffectParticle } from '@axe/domain/effect/particles/shared';

/**
 * A beam.
 */

/** Where the beam lands. It is held there, so the sparks are held too. */
export function emitBeam(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // This layer sits over the target; nothing happens before the shot, so nothing shows while it gathers.
  const fired = clamp01((progress - 0.28) / 0.72);
  if (fired < 0.09) return;

  const life = fired > 0.8 ? 1 - (fired - 0.8) / 0.2 : 1;

  // The sparks broken and thrown back where it strikes, scattered strongly upwards so they read as a splash.
  for (let index = 0; index < 40; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.4 + random() * 2.6);
    const local = (progress * 3.8 + random()) % 1;
    const travel = speed * (1 - Math.pow(1 - local, 2.4));
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.6 + Math.sin(angle) * travel * 0.55 - travel * 0.42,
      size: base * 0.15 * (1 - local * 0.4),
      angle,
      stretch: 3.4 + local * 4.5,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: life * (1 - local) * 0.95,
      shape: 'streak',
    });
  }

  // The fragments ground off and thrown; light alone has no weight.
  for (let index = 0; index < 12; index++) {
    const angle = random() * Math.PI * 2;
    const local = (progress * 2.4 + random()) % 1;
    const travel = base * (0.8 + random() * 2.2) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.4 + Math.sin(angle) * travel * 0.5 - travel * 0.55 + base * local * local * 1.4,
      size: base * (0.1 + random() * 0.1),
      angle: angle + local * 6,
      stretch: 1,
      color: ramp.cool,
      alpha: life * (1 - local) * 0.8,
      shape: 'chunk',
    });
  }

  for (let index = 0; index < 12; index++) {
    const local = (progress * 1.6 + random()) % 1;
    particles.push({
      x: (random() - 0.5) * base * 2.4,
      y: -base * (0.4 + local * 2.6),
      size: base * (0.7 + local * 1.3),
      angle: 0,
      stretch: 1,
      color: '#2f2823',
      alpha: life * (1 - local) * 0.26,
      shape: 'smoke',
    });
  }
}
