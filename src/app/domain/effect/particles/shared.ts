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

/** `#rgb` / `#rrggbb` を rgba() に変換する。既に関数記法ならそのまま使う。 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (!hex.startsWith('#')) return hex;

  const digits = hex.slice(1);
  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits;
  if (expanded.length < 6) return hex;

  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);
  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)) return hex;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
