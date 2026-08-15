import {
  type ColorRamp,
  easeOutQuad,
  type EffectParticle,
  fadeInOut,
  flameColor,
} from '@axe/domain/effect/particles/shared';

/**
 * What is breathed out and what is drawn in.
 */

/** The blast of a breath, which swirls about the target and scatters. */
export function emitBreath(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // This layer sits over the target; shown before it arrives, the target burns before it is breathed on.
  if (progress < 0.12) return;

  const life = progress > 0.74 ? 1 - (progress - 0.74) / 0.26 : 1;

  // It breaks on the struck face and sprays outwards; drifting slowly it reads as a breeze.
  for (let index = 0; index < 38; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 4.2 + phase) % 1;
    const speed = 0.7 + random() * 0.6;
    const blast = base * (0.3 + easeOutQuad(local) * 2.6 * speed);
    particles.push({
      x: Math.cos(angle) * blast,
      y: Math.sin(angle) * blast * 0.55 - base * (0.25 + local * local * 1.7),
      size: base * (0.4 + random() * 0.45) * (1 - local * 0.3),
      angle,
      // It is drawn out along its travel; left round, the speed does not read.
      stretch: 1.6 + local * 2.4,
      color: flameColor(local, ramp),
      alpha: life * (1 - local) * 0.8,
      shape: local < 0.5 ? 'streak' : 'glow',
    });
  }

  for (let index = 0; index < 10; index++) {
    const local = (progress * 1.6 + random()) % 1;
    particles.push({
      x: (random() - 0.5) * base * 2.6,
      y: -base * (0.9 + local * 2.4),
      size: base * (0.8 + local * 1.3),
      angle: 0,
      stretch: 1,
      color: '#2f2823',
      alpha: life * (1 - local) * 0.22,
      shape: 'smoke',
    });
  }
}

/** The life drained: the particles drawn out of the target. */
export function emitDrain(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.2);
  if (life <= 0) return;

  for (let index = 0; index < 26; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 2 + phase) % 1;
    // They gather inwards; the other way round it reads as healing.
    const radius = base * (1.5 - local * 1.3);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.55 - base * (0.3 + local * 0.9),
      size: base * (0.12 + random() * 0.08),
      angle: 0,
      stretch: 1,
      color: local > 0.6 ? ramp.hot : ramp.mid,
      alpha: life * fadeInOut(local, 0.2) * 0.9,
      shape: 'glow',
    });
  }
}
