import {
  clamp01,
  type ColorRamp,
  easeOutQuad,
  type EffectParticle,
  fadeInOut,
} from '@axe/domain/effect/particles/shared';

/**
 * 術。
 *
 * 雷・氷・渦・瘴気・オーラ・転移・障壁・治癒。
 */

/** 回復。下から湧いて立ち上る光の粒と、包み込む柔らかい光。 */
export function emitHeal(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.2);
  if (life <= 0) return;

  for (let index = 0; index < 34; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.15 + random() * 0.75);
    const local = (progress * 1.5 + phase) % 1;
    const spin = angle + local * 1.6;
    particles.push({
      x: Math.cos(spin) * radius * (1 - local * 0.45),
      y: -base * (0.1 + easeOutQuad(local) * 2.6),
      size: base * (0.12 + random() * 0.1),
      angle: 0,
      stretch: 1,
      color: local < 0.4 ? ramp.hot : ramp.mid,
      alpha: life * fadeInOut(local, 0.2) * 0.95,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 10; index++) {
    const local = (progress * 1.1 + random()) % 1;
    particles.push({
      x: (random() - 0.5) * base * 1.2,
      y: -base * (0.3 + local * 1.8),
      size: base * (0.9 + random() * 0.6),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: life * fadeInOut(local, 0.35) * 0.32,
      shape: 'glow',
    });
  }
}

/** 落雷。稲妻は SVG 側。ここは着弾の白熱と跳ねる放電。 */
export function emitBolt(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const flash = clamp01(progress / 0.2);
  if (flash < 1) {
    particles.push({
      x: 0,
      y: -base * 0.5,
      size: base * (2 + flash * 3),
      angle: 0,
      stretch: 1,
      color: ramp.hot,
      alpha: (1 - flash) * 0.95,
      shape: 'glow',
    });
  }

  for (let index = 0; index < 24; index++) {
    const angle = random() * Math.PI * 2;
    const speed = base * (1.2 + random() * 2.2);
    const born = random() * 0.18;
    const local = clamp01((progress - born) / 0.6);
    if (local <= 0 || local >= 1) continue;
    const travel = speed * (1 - Math.pow(1 - local, 2.6));
    // 放電は明滅させる。連続的に薄くするより電気らしい。
    const flicker = Math.floor(progress * 40 + index) % 3 === 0 ? 0.35 : 1;
    particles.push({
      x: Math.cos(angle) * travel,
      y: Math.sin(angle) * travel * 0.5 - base * 0.2,
      size: base * 0.1,
      angle,
      stretch: 3.4,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: (1 - local) * flicker * 0.9,
      shape: 'streak',
    });
  }
}

/** 氷結。結晶は SVG 側。ここは白い冷気と細かいきらめき。 */
export function emitFrost(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.22);
  if (life <= 0) return;

  for (let index = 0; index < 20; index++) {
    const angle = random() * Math.PI * 2;
    const born = random() * 0.3;
    const local = clamp01((progress - born) / 0.7);
    if (local <= 0 || local >= 1) continue;
    const radius = base * (2 - easeOutQuad(local) * 1.6);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.55 - base * (0.2 + local * 0.5),
      size: base * (0.6 + local * 0.7),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: fadeInOut(local, 0.3) * 0.3,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 26; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.2 + random() * 1.1);
    const local = (progress * 1.6 + phase) % 1;
    // きらめきは点滅させる。氷の反射に見える。
    const twinkle = Math.sin(local * Math.PI) * (0.5 + 0.5 * Math.sin(phase * 30 + progress * 40));
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.5 - base * (0.2 + local * 1.4),
      size: base * 0.11,
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: life * Math.max(0, twinkle) * 0.9,
      shape: 'glow',
    });
  }
}

/** 竜巻。渦に巻き上げられる砂と、周回する風の筋。 */
export function emitVortex(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.16);
  if (life <= 0) return;

  for (let index = 0; index < 44; index++) {
    const phase = random();
    const spinSeed = random() * Math.PI * 2;
    const local = (progress * 1.4 + phase) % 1;
    const height = local;
    const radius = base * (0.3 + height * 1.2);
    const angle = spinSeed + progress * Math.PI * 7 + height * Math.PI * 2;
    const front = Math.sin(angle);
    particles.push({
      x: Math.cos(angle) * radius,
      y: front * radius * 0.24 - base * (0.1 + height * 3.4),
      size: base * (0.3 + random() * 0.25) * (1 - height * 0.35),
      angle: angle + Math.PI / 2,
      stretch: 2.6,
      // 手前に来た粒だけ明るくすると、平面ではなく筒に見える。
      alpha: life * Math.max(0.04, 0.35 + front * 0.4) * (1 - height * 0.35),
      color: front > 0 ? ramp.mid : ramp.cool,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 14; index++) {
    const phase = random();
    const local = (progress * 1.2 + phase) % 1;
    const angle = random() * Math.PI * 2 + progress * 8;
    const radius = base * (0.9 + random() * 0.9);
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.3 - base * 0.1,
      size: base * (0.6 + local * 0.8),
      angle: 0,
      stretch: 1,
      color: '#7a7168',
      alpha: life * (1 - local) * 0.3,
      shape: 'smoke',
    });
  }
}

/** 毒霧。低く滞留する霧と、浮かび上がる泡。 */
export function emitMiasma(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.24);
  if (life <= 0) return;

  for (let index = 0; index < 26; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.3 + random() * 1.3);
    const drift = progress * 1.4 + phase * Math.PI * 2;
    particles.push({
      x: Math.cos(angle + drift * 0.35) * radius,
      y: Math.sin(angle + drift * 0.35) * radius * 0.42 - base * (0.15 + Math.sin(drift) * 0.18 + random() * 0.35),
      size: base * (0.9 + random() * 0.9),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: life * 0.34,
      shape: 'smoke',
    });
  }

  for (let index = 0; index < 16; index++) {
    const phase = random();
    const local = (progress * 1.3 + phase) % 1;
    particles.push({
      x: (random() - 0.5) * base * 1.6,
      y: -base * (0.1 + local * 1.9),
      size: base * (0.1 + random() * 0.08),
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.mid : ramp.hot,
      alpha: life * fadeInOut(local, 0.25) * 0.85,
      shape: 'glow',
    });
  }
}

/** 闘気。足元から吹き上がる気と、周回する光。 */
export function emitAura(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.26);
  if (life <= 0) return;

  for (let index = 0; index < 36; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const radius = base * (0.35 + random() * 0.55);
    const local = (progress * 1.8 + phase) % 1;
    const spin = angle + progress * 6;
    particles.push({
      x: Math.cos(spin) * radius * (1 - local * 0.5),
      y: -base * (0.05 + easeOutQuad(local) * 2.4),
      size: base * (0.14 + random() * 0.12),
      angle: Math.PI / 2,
      stretch: 2.2 + local * 2,
      color: local < 0.45 ? ramp.hot : ramp.mid,
      alpha: life * (1 - local) * 0.9,
      shape: 'streak',
    });
  }

  for (let index = 0; index < 12; index++) {
    const phase = random();
    const local = (progress * 1.2 + phase) % 1;
    particles.push({
      x: (random() - 0.5) * base * 1.1,
      y: -base * (0.2 + local * 1.5),
      size: base * (0.7 + local * 0.7),
      angle: 0,
      stretch: 1,
      color: ramp.cool,
      alpha: life * fadeInOut(local, 0.3) * 0.28,
      shape: 'glow',
    });
  }
}

/** 障壁の粒。面に沿って走り、当たった所で弾ける。 */
export function emitBarrier(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.18);
  if (life <= 0) return;

  for (let index = 0; index < 24; index++) {
    const phase = random();
    const angle = phase * Math.PI * 2 + progress * 3;
    const radius = base * 0.95;
    particles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.85 - base * 0.9,
      size: base * 0.13,
      angle: angle + Math.PI / 2,
      stretch: 2.4,
      color: index % 3 === 0 ? ramp.hot : ramp.mid,
      alpha: life * (0.5 + 0.5 * Math.sin(progress * 12 + phase * 9)) * 0.85,
      shape: 'streak',
    });
  }
}

/** 転移の粒。足元から巻き上がって消える。 */
export function emitWarp(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  const life = fadeInOut(progress, 0.22);
  if (life <= 0) return;

  for (let index = 0; index < 34; index++) {
    const phase = random();
    const angle = random() * Math.PI * 2;
    const local = (progress * 1.7 + phase) % 1;
    const radius = base * (0.7 - local * 0.55);
    const spin = angle + local * 4;
    particles.push({
      x: Math.cos(spin) * radius,
      y: Math.sin(spin) * radius * 0.5 - base * (0.1 + easeOutQuad(local) * 2.6),
      size: base * (0.1 + random() * 0.1),
      angle: 0,
      stretch: 1,
      color: local < 0.5 ? ramp.hot : ramp.mid,
      alpha: life * fadeInOut(local, 0.25) * 0.95,
      shape: 'glow',
    });
  }
}
