export { clamp01, fadeInOut, seededRandom } from '@axe/domain/effect/timeline/shared';
import { clamp01 } from '@axe/domain/effect/timeline/shared';
/**
 * 共有の下ごしらえ。
 *
 * 粒 1 つの形と、色・時間の均し方だけを置く。ここから家族ごとの module を参照しない。
 */

export type ParticleShape = 'glow' | 'streak' | 'smoke' | 'chunk';

export interface EffectParticle {
  x: number;
  y: number;
  size: number;
  /** streak のときだけ使う。進行方向のラジアン。 */
  angle: number;
  /** streak の伸び。1 で正円。 */
  stretch: number;
  color: string;
  alpha: number;
  shape: ParticleShape;
}

export interface EffectParticleLayer {
  /** canvas の大きさ(px)。 */
  width: number;
  height: number;
  /** canvas 内で対象の足元が来る位置(px)。 */
  originX: number;
  originY: number;
  particles: EffectParticle[];
}

/** 白熱 → 明色 → 暗色へ落ちる色ランプ。明度差が視線を引くので白を必ず通す。 */
export interface ColorRamp {
  hot: string;
  mid: string;
  cool: string;
}

export const HOT = '#ffffff';

/** 炎の色。白熱から明色、暗色へ落として最後は煙色に寄せる。 */
export function flameColor(local: number, ramp: ColorRamp): string {
  if (local < 0.2) return ramp.hot;
  if (local < 0.55) return ramp.mid;
  return ramp.cool;
}

export function easeOutQuad(value: number): number {
  const clamped = clamp01(value);
  return 1 - (1 - clamped) * (1 - clamped);
}
