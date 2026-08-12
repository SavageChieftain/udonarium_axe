import { clamp01, type ColorRamp, easeOutQuad, type EffectParticle } from '@axe/domain/effect/particles/shared';

/**
 * コマそのものに起きること。
 *
 * 崩れて散る粒と、噴き出す血。
 */

/**
 * 崩壊。コマが砕けて、粒になって立ち上って消える。
 *
 * 下から順に崩す。全体が一斉に散ると、爆発と見分けが付かない。
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
    // 下の欠片から先に持っていかれる。
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
 * 血しぶき。飛んだ滴が落ちて散る。
 *
 * 一様に散らすと霧になる。大小を混ぜ、速い滴ほど尾を引かせ、
 * 落ちるにつれて速度を失わせると液体らしく見える。
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
    // 斬り抜けた側（上と横）へ偏らせる。真下へは飛ばない。
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
      // 速い滴ほど長い尾を引く。落ちきる頃には丸い滴に戻る。
      stretch: 1 + (1 - local) * speed * 2.4,
      color: heavy > 0.75 ? ramp.hot : ramp.cool,
      alpha: life * (1 - local * 0.45),
      shape: local < 0.55 ? 'streak' : 'chunk',
    });
  }

  // 傷口の細かい霧。近くだけに薄く出す。
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
