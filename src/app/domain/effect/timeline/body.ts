import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import { ringSvg } from '@axe/domain/effect/effect-shapes';
import {
  blank,
  clamp01,
  colorsOf,
  easeOutCubic,
  type EffectSprite,
  fadeInOut,
  type Point3,
  round2,
  takeRandoms,
} from '@axe/domain/effect/timeline/shared';

/**
 * コマそのものに起きること。
 *
 * 崩れて消える・血を噴く。立ち絵を切って動かすので、他の演出とは作りが違う。
 */

const DEFEAT_SHARD_COUNT = 9;
const DISSOLVE_COLUMNS = 4;
const DISSOLVE_ROWS = 6;
/** 破片 1 マスの大きさ。コマの絵はマス目 1 つぶんに収まっている。 */
const DISSOLVE_PIECE_SCALE = 0.34;
const GORE_DROP_COUNT = 14;
const GORE_DRIP_COUNT = 5;
const GORE_STAIN_COUNT = 9;
const GORE_PULSE_COUNT = 3;
/** 噴出の向き(度)。心拍ごとに少し振れる。 */
const GORE_JET_ANGLES = [-88, -104, -72];
/** 滴の飛ぶ向き(度)。斬り抜けた側へ偏らせ、真上と真下は薄くする。 */
const GORE_SPRAY_ANGLES = [-142, -118, -101, -84, -66, -49, -32, -14, 6, 26, -160, -75, -40, 44];
/**
 * 崩壊。コマの絵そのものを格子に切り分け、破片として散らす。
 *
 * 光の粒だけを出しても「消えた」にしかならない。コマの絵を切って動かすと、
 * その場に立っていた物が砕けたことになる。絵が無いコマは光の欠片で代用する。
 */
export function appendDissolve(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number,
  image: string
): void {
  const life = 1 - clamp01((progress - 0.55) / 0.45);
  const jitters = takeRandoms(random, DISSOLVE_COLUMNS * DISSOLVE_ROWS * 3);
  const piece = base * DISSOLVE_PIECE_SCALE;

  if (image.length > 0) {
    for (let row = 0; row < DISSOLVE_ROWS; row++) {
      for (let column = 0; column < DISSOLVE_COLUMNS; column++) {
        const index = row * DISSOLVE_COLUMNS + column;
        const seed = jitters[index * 3];
        const spin = jitters[index * 3 + 1] - 0.5;
        const lift = jitters[index * 3 + 2];
        // 下の段から先に崩れる。一斉に散ると爆発に見える。
        // 下の段から順に、間を空けて崩す。一斉に散ると爆発に見える。
        const born = (1 - row / DISSOLVE_ROWS) * 0.42 + seed * 0.14;
        const local = clamp01((progress - born) / 0.52);
        if (local <= 0) continue;

        const fly = easeOutCubic(local);
        const away = (column / (DISSOLVE_COLUMNS - 1) - 0.5) * 2;
        sprites.push({
          ...blank(),
          key: `${prefix}-dissolve-piece-${index}`,
          x: center.x,
          y: center.y,
          z: center.z + base * 0.9,
          // 格子の 1 マスだけを見せ、そのマスごと飛ばす。
          offsetX: away * piece * (0.5 + fly * 2.2) + spin * piece * fly * 1.6,
          offsetY: (row / (DISSOLVE_ROWS - 1) - 0.5) * piece * DISSOLVE_ROWS * 0.5 - piece * fly * (1.6 + lift * 2.4),
          width: piece * DISSOLVE_COLUMNS,
          height: piece * DISSOLVE_ROWS,
          rotate: spin * 90 * fly,
          opacity: life * (1 - local) ** 0.7,
          background: `url(${image}) center/contain no-repeat`,
          clipPath: cellClipPath(column, row),
        });
      }
    }
  }

  // 砕けた縁から立ち上る光。破片だけだと、ただ散らばって見える。
  for (let shard = 0; shard < DEFEAT_SHARD_COUNT; shard++) {
    const seed = jitters[shard % jitters.length];
    const phase = (progress * 1.5 + seed) % 1;
    const rise = easeOutCubic(phase);
    const height = base * (0.4 + seed * 0.7);
    sprites.push({
      ...blank(),
      key: `${prefix}-dissolve-shard-${shard}`,
      x: center.x,
      y: center.y,
      z: center.z + base * (0.2 + rise * 2.6),
      offsetX: (seed - 0.5) * base * 1.6 * (1 - rise * 0.4),
      offsetY: -height / 2,
      width: base * 0.09,
      height,
      opacity: life * (1 - phase) * 0.75,
      background: `linear-gradient(180deg, transparent, ${preset.colorPrimary} 55%, #ffffff)`,
      borderRadius: '50%',
    });
  }

  const ring = base * (1.5 + easeOutCubic(progress) * 1.2);
  sprites.push({
    ...blank(),
    key: `${prefix}-dissolve-ring`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: ring,
    height: ring,
    opacity: life * 0.6,
    svg: ringSvg(colorsOf(preset), 6),
    animation: 'effectSpinSlow 3s linear infinite',
    flat: true,
  });
}

/** 格子の 1 マスだけを見せる切り抜き。 */
function cellClipPath(column: number, row: number): string {
  const left = (column / DISSOLVE_COLUMNS) * 100;
  const right = 100 - ((column + 1) / DISSOLVE_COLUMNS) * 100;
  const top = (row / DISSOLVE_ROWS) * 100;
  const bottom = 100 - ((row + 1) / DISSOLVE_ROWS) * 100;
  return `inset(${round2(top)}% ${round2(right)}% ${round2(bottom)}% ${round2(left)}%)`;
}

/**
 * 血しぶき。
 *
 * 中心から直線を放射させると星形の閃光になってしまう。実際の血は
 * 傷口の塊・飛んだ滴・したたり・地面の跡が別々に見えるので、層に分けて置く。
 * 地面の跡は真円ではなく、主だまりの周りに大小の飛沫が散る形にする。
 */
export function appendGore(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  const life = fadeInOut(progress, 0.06);
  const jitters = takeRandoms(random, GORE_DROP_COUNT * 3 + GORE_DRIP_COUNT * 2);
  const burst = Math.min(1, progress / 0.18);
  const wound = { x: center.x, y: center.y, z: center.z + base * 0.95 };

  // 傷口の塊。まずここから出ていることを見せる。
  const core = base * (0.5 + easeOutCubic(burst) * 0.45);
  sprites.push({
    ...blank(),
    key: `${prefix}-gore-core`,
    x: wound.x,
    y: wound.y,
    z: wound.z,
    width: core * 1.3,
    height: core,
    rotate: -18,
    opacity: life * (1 - progress * 0.5),
    background: `radial-gradient(circle, ${preset.colorPrimary} 0%, ${preset.colorSecondary} 55%, transparent 78%)`,
    borderRadius: '50%',
  });

  // 飛んだ滴。大小を混ぜ、飛んだ向きへ伸ばす。粒が揃うと作り物に見える。
  for (let drop = 0; drop < GORE_DROP_COUNT; drop++) {
    const seed = jitters[drop * 3];
    const spin = jitters[drop * 3 + 1];
    const grade = jitters[drop * 3 + 2];
    const angle = GORE_SPRAY_ANGLES[drop % GORE_SPRAY_ANGLES.length] + (spin - 0.5) * 26;
    const radians = (angle * Math.PI) / 180;
    const flight = Math.min(1, burst * (0.6 + seed * 0.8));
    const reach = base * (0.6 + seed * 2.2) * easeOutCubic(flight);
    const size = base * (0.07 + grade * grade * 0.16);
    sprites.push({
      ...blank(),
      key: `${prefix}-gore-drop-${drop}`,
      x: wound.x,
      y: wound.y,
      z: wound.z,
      offsetX: Math.cos(radians) * reach,
      offsetY: Math.sin(radians) * reach + base * flight * flight * 0.9,
      width: size * (1.4 + flight * 1.6),
      height: size,
      rotate: angle,
      opacity: life * (1 - flight * 0.35),
      background: `linear-gradient(90deg, transparent, ${preset.colorSecondary} 45%, ${preset.colorPrimary})`,
      borderRadius: '50%',
    });
  }

  // 傷口からしたたる血。落ちきる前に細くなって切れる。
  for (let drip = 0; drip < GORE_DRIP_COUNT; drip++) {
    const seed = jitters[GORE_DROP_COUNT * 3 + drip * 2];
    const spread = jitters[GORE_DROP_COUNT * 3 + drip * 2 + 1];
    const fall = easeOutCubic(Math.min(1, progress * (0.8 + seed * 1.1)));
    const length = base * (0.3 + seed * 0.8) * (1 - fall * 0.35);
    sprites.push({
      ...blank(),
      key: `${prefix}-gore-drip-${drip}`,
      x: wound.x,
      y: wound.y,
      z: wound.z - base * fall * 1.5,
      offsetX: (spread - 0.5) * base * 1.1,
      offsetY: -length / 2,
      width: base * (0.05 + seed * 0.04),
      height: length,
      opacity: life * (1 - fall * 0.5),
      background: `linear-gradient(180deg, ${preset.colorSecondary}, ${preset.colorPrimary} 70%, transparent)`,
      borderRadius: '50%',
    });
  }

  appendGoreJet(sprites, `${prefix}-gore`, wound, base, progress, preset, life);
  appendGoreStain(sprites, `${prefix}-gore`, center, base, progress, preset, jitters, life);
}

/**
 * 噴き出す血。傷口から太い筋が脈打って伸びる。
 *
 * 滴を散らすだけでは「にじむ」で終わる。心拍で 3 度突き上げると噴出になる。
 */
function appendGoreJet(
  sprites: EffectSprite[],
  prefix: string,
  wound: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  life: number
): void {
  for (let pulse = 0; pulse < GORE_PULSE_COUNT; pulse++) {
    const born = pulse * 0.16;
    const local = clamp01((progress - born) / 0.5);
    if (local <= 0 || local >= 1) continue;

    const angle = GORE_JET_ANGLES[pulse % GORE_JET_ANGLES.length];
    const radians = (angle * Math.PI) / 180;
    // 突き上げてから伸びきる。等速で伸ばすと水道の流れに見える。
    const reach = base * (1.4 + pulse * 0.4) * easeOutCubic(Math.min(1, local * 1.8)) * 2.1;
    const thickness = base * (0.34 - pulse * 0.05) * (1 - local * 0.45);
    sprites.push({
      ...blank(),
      key: `${prefix}-jet-${pulse}`,
      x: wound.x,
      y: wound.y,
      z: wound.z,
      offsetX: Math.cos(radians) * reach * 0.5,
      offsetY: Math.sin(radians) * reach * 0.5,
      width: reach,
      height: thickness,
      rotate: angle,
      opacity: life * (1 - local) * 0.95,
      background: `linear-gradient(90deg, ${preset.colorSecondary} 10%, ${preset.colorPrimary} 45%, ${preset.colorSecondary} 78%, transparent)`,
      borderRadius: '50%',
    });

    // 噴き上がった先で割れる塊。ここが「ブシャッ」の頭になる。
    const head = base * (0.3 + local * 0.5);
    sprites.push({
      ...blank(),
      key: `${prefix}-jet-head-${pulse}`,
      x: wound.x,
      y: wound.y,
      z: wound.z,
      offsetX: Math.cos(radians) * reach,
      offsetY: Math.sin(radians) * reach,
      width: head * 1.25,
      height: head,
      rotate: angle,
      opacity: life * (1 - local) * 0.9,
      background: `radial-gradient(circle, ${preset.colorPrimary} 0%, ${preset.colorSecondary} 60%, transparent 80%)`,
      borderRadius: '54% 46% 42% 58% / 46% 52% 48% 54%',
    });
  }
}

/** 地面の跡。真円のにじみではなく、主だまりと飛沫に分ける。 */
export function appendGoreStain(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  jitters: readonly number[],
  life: number
): void {
  const spread = easeOutCubic(Math.min(1, progress * 1.4));
  const pool = base * (0.5 + spread * 1.1);
  sprites.push({
    ...blank(),
    key: `${prefix}-pool`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: pool * 1.25,
    height: pool * 0.85,
    rotate: -24,
    opacity: life * 0.9,
    background: `radial-gradient(circle, ${preset.colorSecondary} 0%, ${preset.colorSecondary} 62%, transparent 80%)`,
    borderRadius: '46% 54% 60% 40% / 52% 44% 56% 48%',
    flat: true,
  });

  for (let stain = 0; stain < GORE_STAIN_COUNT; stain++) {
    const seed = jitters[stain % jitters.length];
    const angle = (stain / GORE_STAIN_COUNT) * Math.PI * 2 + seed * 1.7;
    const distance = base * (0.7 + seed * 2.1) * spread;
    const size = base * (0.08 + (1 - seed) * 0.2);
    sprites.push({
      ...blank(),
      key: `${prefix}-stain-${stain}`,
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
      z: center.z + 1,
      width: size * (1 + seed),
      height: size,
      rotate: (angle * 180) / Math.PI,
      opacity: life * (0.55 + seed * 0.35),
      background: preset.colorSecondary,
      borderRadius: '52% 48% 44% 56% / 48% 56% 44% 52%',
      flat: true,
    });
  }
}
