import { type EffectCast } from '@axe/domain/effect/effect-cast';
import { type EffectKind } from '@axe/domain/effect/effect-kind';
import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import { type ShapeColors } from '@axe/domain/effect/effect-shapes';
import { type ViewRotation } from '@axe/domain/effect/effect-view';

/**
 * 共有の下ごしらえ。
 *
 * 座標・色・乱数のように、どの演出からも使うものだけを置く。
 * ここから家族ごとの module を参照しない（参照すると輪になる）。
 */

/**
 * 着弾の描き方。
 *
 * 飛び道具や刃は、当たった先の弾け方を属性ごとの演出へ委ねる。委ね先を import すると
 * 呼び合いになるので、**渡してもらう**。
 */
export type ImpactPainter = (
  kind: EffectKind,
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
) => void;

export interface EffectSprite {
  key: string;
  x: number;
  y: number;
  z: number;
  /** 板ポリ面内での横ずらし(px)。カメラを回しても形が崩れない。 */
  offsetX: number;
  /** 板ポリ面内での縦ずらし(px)。画面下方向が正。 */
  offsetY: number;
  width: number;
  height: number;
  rotate: number;
  opacity: number;
  background: string;
  borderRadius: string;
  /** 空文字なら切り抜き無し。 */
  clipPath: string;
  /** 空文字なら影無し。box-shadow の値をそのまま渡す。 */
  shadow: string;
  /** 空文字ならアニメーション無し。CSS animation ショートハンドを内側の層に掛ける。 */
  animation: string;
  /** animation を掛ける層の transform-origin。空文字なら中心。 */
  origin: string;
  /** 空文字以外なら中身を SVG として描く。経過時間で変えないこと。 */
  svg: string;
  /** true なら盤面に寝かせて描く。false ならカメラに正対させる。 */
  flat: boolean;
}

export interface EffectSpriteOptions {
  baseSize: number;
  /** 盤面の向き。飛翔体を画面上の進行方向へ引き伸ばすのに使う。 */
  viewRotation?: ViewRotation | null;
  /** 描画しない対象の identifier（視界外のコマなど）。 */
  hiddenIdentifiers?: ReadonlySet<string>;
  /** 追従表示のため、対象の現在位置を解決する。省略時は発火時の座標を使う。 */
  resolvePosition?: (identifier: string) => { x: number; y: number; z: number } | null;
  /**
   * 対象コマの絵。崩壊や両断は、コマの絵そのものを切り分けて動かす。
   * 絵が無いコマでは光の欠片で代用する。
   */
  resolveImage?: (identifier: string) => string;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

const FLARE_SPIKE_COUNT = 4;
export function along(origin: Point3, center: Point3, at: number): Point3 {
  return {
    x: origin.x + (center.x - origin.x) * at,
    y: origin.y + (center.y - origin.y) * at,
    z: origin.z + (center.z - origin.z) * at,
  };
}

/** 加算合成を使わないぶん、光り方は box-shadow の広がりで作る。 */
export function glow(innerRadius: number, innerColor: string, outerRadius?: number, outerColor?: string): string {
  const inner = `0 0 ${Math.round(innerRadius * 1.4)}px ${innerColor}`;
  if (outerRadius == null || outerColor == null) return inner;
  return `${inner}, 0 0 ${Math.round(outerRadius * 1.4)}px ${outerColor}`;
}

export function colorsOf(preset: EffectPreset): ShapeColors {
  return { core: preset.colorPrimary, edge: preset.colorSecondary };
}

/** 中心から四方に伸びる光の筋。アニメ調の閃光に欠かせない。 */
export function appendFlareSpikes(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  local: number,
  preset: EffectPreset,
  span: number,
  lift: number
): void {
  for (let spike = 0; spike < FLARE_SPIKE_COUNT; spike++) {
    const length = base * span * (0.4 + easeOutCubic(local) * 1.4);
    sprites.push({
      ...blank(),
      key: `${prefix}-flare-${spike}`,
      x: center.x,
      y: center.y,
      z: center.z + lift,
      width: length,
      height: base * 0.08 * (1 - local * 0.7),
      rotate: spike * 45,
      opacity: (1 - local) * 0.9,
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 30%, #ffffff 50%, ${preset.colorPrimary} 70%, transparent)`,
      borderRadius: '50%',
    });
  }
}

/** 対象コマの絵。取れないときは空を返し、呼び出し側が光の欠片で代用する。 */
export function imageOf(options: EffectSpriteOptions, identifier: string): string {
  return options.resolveImage?.(identifier) ?? '';
}

/** 発射元。指定が無ければ対象の斜め上から飛んでくる扱いにする。 */
export function projectileOrigin(cast: EffectCast, center: Point3, base: number): Point3 {
  if (cast.origin) return cast.origin;
  return { x: center.x - base * 4, y: center.y - base * 4, z: center.z + base * 4 };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 経路上の 1 点。飛翔体と違って山なりにはしない。 */
export function pointBetween(from: Point3, to: Point3, at: number): Point3 {
  return {
    x: from.x + (to.x - from.x) * at,
    y: from.y + (to.y - from.y) * at,
    z: from.z + (to.z - from.z) * at,
  };
}

export function blank(): EffectSprite {
  return {
    key: '',
    x: 0,
    y: 0,
    z: 0,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    rotate: 0,
    opacity: 1,
    background: '',
    borderRadius: '0',
    clipPath: '',
    shadow: '',
    animation: '',
    origin: '',
    svg: '',
    flat: false,
  };
}

/** 経過時間で乱数の消費数が変わらないよう、必要なぶんを先に取り出す。 */
export function takeRandoms(random: () => number, count: number): number[] {
  const values: number[] = [];
  for (let index = 0; index < count; index++) values.push(random());
  return values;
}

export function normalize(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

export function easeOutCubic(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** 立ち上がり `rise` の割合で 0→1、残りで 1→0 に落ちる。 */
export function fadeInOut(value: number, rise: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  if (clamped < rise) return clamped / rise;
  return 1 - (clamped - rise) / (1 - rise);
}

export function seededRandom(seed: number): () => number {
  let state = Math.floor(Math.abs(seed)) % 4294967296 || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
