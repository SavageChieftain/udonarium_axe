import {
  type ColorRamp,
  easeOutQuad,
  type EffectParticle,
  fadeInOut,
  flameColor,
} from '@axe/domain/effect/particles/shared';

/**
 * 吐くもの・吸うもの。
 */

/** ブレスの吹き付け。対象の周りで渦を巻いて散る。 */
export function emitBreath(
  particles: EffectParticle[],
  random: () => number,
  progress: number,
  base: number,
  ramp: ColorRamp
): void {
  // この層は対象の上にある。届く前から出すと、吹き付ける前に燃えていることになる。
  if (progress < 0.12) return;

  const life = progress > 0.74 ? 1 - (progress - 0.74) / 0.26 : 1;

  // 当たった面で割れて外へ噴き散る。ゆっくり漂わせると、そよ風に見えてしまう。
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
      // 進む向きへ引き伸ばす。丸のままだと速さが読めない。
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

/** 吸収される生命力。対象から吸い出される粒。 */
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
    // 外から中心へ集める。逆向きにすると回復に見えてしまう。
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
