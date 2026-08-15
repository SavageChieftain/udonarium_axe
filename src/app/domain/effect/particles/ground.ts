import {
  clamp01,
  type ColorRamp,
  easeOutQuad,
  type EffectParticle,
  fadeInOut,
} from '@axe/domain/effect/particles/shared';

/**
 * The ground.
 *
 * A slam, rubble, an upheaval, gravity, a charge. Dust and fragments are what give them weight.
 */

/** The landing: the dust thrown up, and the small fragments that bounce. */
export function emitImpact(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.14);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.2,
      size: base * (1.4 + flash * 2),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.85,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 18; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.2;
    const local = clamp01((progress - born) / 0.75);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.6 + random() * 2.2) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.5 - base * (0.1 + local * 0.7),
      size: base * (0.7 + local * 1.2),
      angle: 0,
      stretch: 1,
      color: '#6a5c4e',
      alpha: fadeInOut(local, 0.25) * 0.34,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 16; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1 + random() * 1.8);
    const local = clamp01(progress / 0.7);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.2));
    particles.push({
      x: Math.cos(angle) * travel,
      y: Math.sin(angle) * travel * 0.45 - base * 0.9 * Math.sin(local * Math.PI),
      size: base * 0.09,
      angle,
      stretch: 2.4,
      color: ramp.mid,
      alpha: (1 - local) * 0.8,
      shape: 'streak',
    });
  }
}

/** Shattering rock: the broken rock flies and the dust stays. */
export function emitRubble(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  for (let index = 0; index < 24; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1 + random() * 2.2);
    const born = random() * 0.12;
    const local = clamp01((progress - born) / 0.8);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2));
    // It is thrown up and falls; the arc alone is what makes it read as stone.
    const lift = base * 2.2 * Math.sin(Math.PI * Math.min(local * 1.1, 1));
    particles.push({
      x: Math.cos(angle) * travel,
      y: Math.sin(angle) * travel * 0.45 - lift,
      size: base * (0.16 + random() * 0.22),
      angle: angle + local * 6,
      stretch: 1,
      color: index % 3 === 0 ? ramp.mid : '#6d5a49',
      alpha: (1 - local * 0.5) * 0.95,
      shape: 'chunk',
    });
  }

  for (let index = 0; index < 16; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.2;
    const local = clamp01((progress - born) / 0.85);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.5 + random() * 2) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.45 - base * (0.1 + local * 0.9),
      size: base * (0.8 + local * 1.5),
      angle: 0,
      stretch: 1,
      color: '#7d6a58',
      alpha: fadeInOut(local, 0.2) * 0.38,
      shape: 'smoke',
    });
  }

  const flash = clamp01(progress / 0.16);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.3,
      size: base * (1.2 + flash * 1.6),
      angle: 0,
      stretch: 1,
      color: ramp.mid,
      alpha: (1 - flash) * 0.7,
      shape: 'glow',
    });
  }
}

/** An upheaval: the dust rising with it, and the clods that fall back. */
export function emitUpheaval(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // The dust rises with the ground.
  const rise = clamp01(progress / 0.45);
  for (let index = 0; index < 26; index++) {
    const angle = random() * Math.PI * 2;
    const radius = base * (0.4 + random() * 1.1);
    const local = clamp01((progress - random() * 0.25) / 0.75);
    if (local <= 0 || local >= 1) continue;
    particles.push({
      x: Math.cos(angle) * radius * (1 + local * 0.6),
      y: Math.sin(angle) * radius * 0.4 - base * (0.2 + easeOutQuad(rise) * 1.6 + local * 0.8),
      size: base * (0.9 + local * 1.4),
      angle: 0,
      stretch: 1,
      color: '#6f5c4a',
      alpha: fadeInOut(local, 0.25) * 0.4,
      shape: 'smoke',
    });
  }

  // The clods thrown up as it breaks, which begin to fall after the ground has risen.
  for (let index = 0; index < 18; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.25;
    const local = clamp01((progress - born) / 0.75);
    if (local <= 0 || local >= 1) continue;
    const radius = base * (0.6 + random() * 1.2);
    const lift = base * (2.4 * Math.sin(Math.PI * Math.min(local * 1.15, 1)));
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.4 - lift,
      size: base * (0.2 + random() * 0.26),
      angle: angle + local * 4,
      stretch: 1,
      color: index % 4 === 0 ? ramp.mid : '#5f4d3d',
      alpha: 0.95,
      shape: 'chunk',
    });
  }

  const glow = clamp01((progress - 0.05) / 0.5);
  if (glow > 0 && glow < 1) {
    for (let index = 0; index < 8; index++) {
      const angle = random() * Math.PI * 2;
      const radius = base * (0.3 + random() * 0.9);
      particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.4 - base * 0.1,
        size: base * (0.5 + random() * 0.5),
        angle: 0,
        stretch: 1,
        color: ramp.mid,
        alpha: fadeInOut(glow, 0.3) * 0.6,
        shape: 'glow',
      });
    }
  }
}

/** The dust under gravity, falling inwards and crushed. */
export function emitGravity(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.16);
  if (life <= 0) return;

  for (let index = 0; index < 28; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 1.6 + phase) % 1;
    const radius = base * (2 - easeOutQuad(local) * 1.9);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5 - base * 0.5,
      size: base * (0.1 + random() * 0.1),
      angle,
      stretch: 2 + local * 3,
      color: local > 0.7 ? ramp.hot : ramp.cool,
      alpha: life * (0.3 + local * 0.7) * 0.9,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 8; index++) {
    const angle = random() * Math.PI * 2;
    const local = (progress * 1.3 + random()) % 1;
    const radius = base * (1.6 - local * 1.4);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5 - base * 0.4,
      size: base * (0.16 + random() * 0.16),
      angle: angle + local * 5,
      stretch: 1,
      color: '#5b5148',
      alpha: life * 0.85,
      shape: 'chunk',
    });
  }
}

/** A strike: the fragments and the dust leap sideways from where it crushed. */
export function emitBash(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.1);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.6,
      size: base * (1.4 + flash * 1.4),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: 1 - flash,
      shape: 'glow',
    });
  }

  // Strongly across and weakly up; straight up it reads as an explosion.
  for (let index = 0; index < 22; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.4 + random() * 2);
    const local = clamp01(progress / 0.55);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.6));
    particles.push({
      x: Math.cos(angle) * travel,
      y: -base * 0.6 + Math.sin(angle) * travel * 0.35 + base * 0.9 * local * local,
      size: base * 0.12 * (1 - local * 0.4),
      angle,
      stretch: 3.6 + local * 3,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * 0.95,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 10; index++) {
    const angle = random() * Math.PI * 2;
    const local = clamp01((progress - random() * 0.15) / 0.8);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.5 + random() * 1.6) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.4 - base * (0.2 + local * 0.5),
      size: base * (0.6 + local * 1),
      angle: 0,
      stretch: 1,
      color: '#6b5f52',
      alpha: fadeInOut(local, 0.25) * 0.34,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 6; index++) {
    const angle = random() * Math.PI * 2;
    const local = clamp01(progress / 0.7);
    if (local <= 0 || local >= 1) continue;
    const distance = base * (0.6 + random() * 1.4) * easeOutQuad(local);
    particles.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.4 - base * (0.4 + Math.sin(local * Math.PI) * 0.8),
      size: base * (0.14 + random() * 0.14),
      angle: angle + local * 6,
      stretch: 1,
      color: '#57503f',
      alpha: 0.9,
      shape: 'chunk',
    });
  }
}
