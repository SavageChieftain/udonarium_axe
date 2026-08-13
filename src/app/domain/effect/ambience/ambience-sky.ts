import {
  ambienceColorOf,
  ambienceDensityOf,
  type AmbienceKind,
  ambiencePalette,
  ambienceWashLevel,
} from '@axe/domain/effect/ambience/ambience-kind';
import {
  clamp01,
  type EffectParticle,
  type EffectParticleLayer,
  seededRandom,
  withAlpha,
} from '@axe/domain/effect/particles/shared';

/**
 * マップ全体に掛ける天候。画面いっぱいの 1 枚に描く。
 *
 * 経過時間から毎回まるごと計算し直す純関数で、位置は画面の端で折り返す。
 * 状態を持たないのでフレームが飛んでも降り方が乱れない。
 */
export interface SkyAmbienceSpec {
  kind: AmbienceKind;
  /** 空なら種類ごとの既定色。 */
  color: string;
  /** 0〜1。0 なら何も出さない。 */
  density: number;
  /** 経過時間(ms)。折り返しは中で行うのでそのまま渡してよい。 */
  elapsed: number;
  /** 描画領域(px)。 */
  width: number;
  height: number;
}

const SEED = 7717;
const MAX_PARTICLES = 700;

/** 100 万 px² あたりの粒の数。密度 1 のときの値。 */
const DENSITY_PER_AREA: Record<AmbienceKind, number> = {
  rain: 420,
  snow: 260,
  ash: 200,
  ember: 170,
  sand: 420,
  fog: 44,
  miasma: 32,
  bloom: 140,
  swamp: 120,
  vent: 90,
  lava: 120,
  blaze: 120,
  frost: 180,
};

export function skyAmbienceLayer(spec: SkyAmbienceSpec): EffectParticleLayer {
  const width = Math.max(spec.width, 0);
  const height = Math.max(spec.height, 0);
  const layer: EffectParticleLayer = { width, height, originX: 0, originY: 0, particles: [] };

  const density = ambienceDensityOf(spec.density);
  const count = particleCount(spec.kind, width, height, density);
  if (count < 1) return layer;

  const color = ambienceColorOf(spec.kind, spec.color);
  const random = seededRandom(SEED);
  const elapsed = Number.isFinite(spec.elapsed) ? spec.elapsed : 0;

  for (let index = 0; index < count; index++) {
    const a = random();
    const b = random();
    const c = random();
    const d = random();
    const particle = emit(spec.kind, { a, b, c, d }, elapsed, width, height, color);
    if (particle) layer.particles.push(particle);
  }
  return layer;
}

/**
 * 画面ぜんぶに掛ける色。粒だけだと「霧が濃い」まで行かないので、
 * 薄い塗りを 1 枚重ねて空気の色を作る。
 */
export function skyAmbienceWash(kind: AmbienceKind, color: string, density: number): string {
  const raw = ambienceDensityOf(density);
  if (raw <= 0) return '';

  const level = ambienceWashLevel(kind, density);
  const tint = ambienceColorOf(kind, color);
  const shade = ambiencePalette(kind).secondary;

  switch (kind) {
    case 'fog':
      // 上げきると上下の濃淡も消えて一面が白く潰れる。手前が見えない霧はそういう見え方になる。
      return (
        `linear-gradient(to bottom, ${withAlpha(tint, round(0.97 * level))} 0%,` +
        ` ${withAlpha(tint, round((0.42 + 0.55 * raw) * level))} 45%, ${withAlpha(tint, round(0.94 * level))} 100%)`
      );
    case 'rain':
      return `linear-gradient(to bottom, ${withAlpha(shade, round(0.36 * level))}, ${withAlpha(shade, round(0.18 * level))})`;
    case 'snow':
      return `linear-gradient(to bottom, ${withAlpha(tint, round(0.26 * level))}, ${withAlpha(shade, round(0.2 * level))})`;
    case 'ash':
      return `linear-gradient(to bottom, ${withAlpha(shade, round(0.44 * level))}, ${withAlpha(shade, round(0.24 * level))})`;
    case 'ember':
      return `radial-gradient(ellipse at 50% 120%, ${withAlpha(tint, round(0.45 * level))}, transparent 70%)`;
    case 'sand':
      return `linear-gradient(to bottom, ${withAlpha(tint, round(0.4 * level))}, ${withAlpha(shade, round(0.32 * level))})`;
    case 'miasma':
      return (
        `radial-gradient(ellipse at 50% 110%, ${withAlpha(tint, round(0.42 * level))}, transparent 76%),` +
        ` linear-gradient(to bottom, transparent, ${withAlpha(shade, round(0.34 * level))})`
      );
    default:
      return '';
  }
}

function particleCount(kind: AmbienceKind, width: number, height: number, density: number): number {
  if (density <= 0 || width <= 0 || height <= 0) return 0;
  const area = (width * height) / 1_000_000;
  const count = Math.round(DENSITY_PER_AREA[kind] * area * density);
  return Math.min(count, MAX_PARTICLES);
}

interface Randoms {
  a: number;
  b: number;
  c: number;
  d: number;
}

function emit(
  kind: AmbienceKind,
  r: Randoms,
  elapsed: number,
  width: number,
  height: number,
  color: string
): EffectParticle | null {
  switch (kind) {
    case 'rain':
      return rain(r, elapsed, width, height, color);
    case 'snow':
      return snow(r, elapsed, width, height, color);
    case 'ash':
      return ash(r, elapsed, width, height, color);
    case 'ember':
      return ember(r, elapsed, width, height, color);
    case 'sand':
      return sand(r, elapsed, width, height, color);
    case 'fog':
      return haze(r, elapsed, width, height, color, 0.008, 0.2);
    case 'miasma':
      return haze(r, elapsed, width, height, color, 0.004, 0.15);
    case 'bloom':
      return bloom(r, elapsed, width, height, color);
    default:
      return null;
  }
}

function rain(r: Randoms, elapsed: number, width: number, height: number, color: string): EffectParticle {
  const speed = 1.1 + r.c * 0.8;
  const span = height + 160;
  return {
    x: wrap(r.a * (width + 200) + elapsed * 0.12, width + 200) - 100,
    y: wrap(r.b * span + elapsed * speed, span) - 80,
    size: 2.2 + r.d * 1.8,
    angle: 1.42,
    stretch: 9 + r.c * 11,
    color,
    alpha: 0.3 + r.d * 0.4,
    shape: 'streak',
  };
}

function snow(r: Randoms, elapsed: number, width: number, height: number, color: string): EffectParticle {
  const speed = 0.045 + r.c * 0.06;
  const span = height + 80;
  return {
    x: wrap(r.a * width + Math.sin(elapsed * 0.0006 + r.a * TAU) * 24, width),
    y: wrap(r.b * span + elapsed * speed, span) - 40,
    size: 3 + r.d * 5,
    angle: 0,
    stretch: 1,
    color,
    alpha: 0.55 + r.d * 0.45,
    shape: 'glow',
  };
}

function ash(r: Randoms, elapsed: number, width: number, height: number, color: string): EffectParticle {
  const speed = 0.02 + r.c * 0.035;
  const span = height + 80;
  return {
    x: wrap(r.a * width + Math.sin(elapsed * 0.0004 + r.a * TAU) * 36, width),
    y: wrap(r.b * span + elapsed * speed, span) - 40,
    size: 2.8 + r.d * 6,
    angle: 0,
    stretch: 1,
    color,
    alpha: 0.3 + r.d * 0.35,
    shape: 'smoke',
  };
}

function ember(r: Randoms, elapsed: number, width: number, height: number, color: string): EffectParticle {
  const speed = 0.05 + r.c * 0.09;
  const span = height + 100;
  const flicker = 0.55 + 0.45 * Math.sin(elapsed * 0.006 + r.a * 12);
  return {
    x: wrap(r.a * width + Math.sin(elapsed * 0.0012 + r.b * TAU) * 20, width),
    y: height + 50 - wrap(r.b * span + elapsed * speed, span),
    size: 2.2 + r.d * 3.6,
    angle: 0,
    stretch: 1,
    color,
    alpha: clamp01((0.5 + r.d * 0.5) * flicker),
    shape: 'glow',
  };
}

function sand(r: Randoms, elapsed: number, width: number, height: number, color: string): EffectParticle {
  const speed = 0.55 + r.c * 0.75;
  const span = width + 320;
  return {
    x: wrap(r.a * span + elapsed * speed, span) - 160,
    y: r.b * height + Math.sin(elapsed * 0.001 + r.a * TAU) * 14,
    size: 2 + r.d * 3,
    angle: 0.06,
    stretch: 8 + r.c * 15,
    color,
    alpha: 0.22 + r.d * 0.3,
    shape: 'streak',
  };
}

/** 大きく薄い塊がゆっくり流れる。霧と瘴気はここを共有する。 */
function haze(
  r: Randoms,
  elapsed: number,
  width: number,
  height: number,
  color: string,
  speed: number,
  alpha: number
): EffectParticle {
  const base = Math.max(width, height);
  const size = base * (0.18 + r.d * 0.34);
  const span = width + size;
  return {
    x: wrap(r.a * span + elapsed * (speed + r.c * speed), span) - size / 2,
    y: r.b * height + Math.sin(elapsed * 0.00018 + r.a * TAU) * height * 0.06,
    size,
    angle: 0,
    stretch: 0.62,
    color,
    alpha: alpha * (0.6 + r.d * 0.7),
    shape: 'smoke',
  };
}

function bloom(r: Randoms, elapsed: number, width: number, height: number, color: string): EffectParticle {
  const pulse = 0.45 + 0.55 * Math.sin(elapsed * 0.0022 + r.a * 9);
  return {
    x: wrap(r.a * width + Math.sin(elapsed * 0.00035 + r.a * TAU) * 44, width),
    y: wrap(r.b * height + Math.cos(elapsed * 0.00028 + r.b * TAU) * 34, height),
    size: 2.4 + r.d * 4.6,
    angle: 0,
    stretch: 1,
    color,
    alpha: clamp01((0.45 + r.d * 0.5) * pulse),
    shape: 'glow',
  };
}

const TAU = Math.PI * 2;

function wrap(value: number, span: number): number {
  if (span <= 0) return 0;
  const remainder = value % span;
  return remainder < 0 ? remainder + span : remainder;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
