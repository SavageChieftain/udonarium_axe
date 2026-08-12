import { type EffectCast, type EffectCastTarget } from '@axe/domain/effect/effect-cast';
import { type EffectKind } from '@axe/domain/effect/effect-kind';
import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import { type ViewRotation } from '@axe/domain/effect/effect-view';
import {
  appendArc,
  appendAura,
  appendBarrier,
  appendBolt,
  appendBurst,
  appendCurse,
  appendFlame,
  appendFrost,
  appendHeal,
  appendMiasma,
  appendNova,
  appendVortex,
  appendWarp,
} from '@axe/domain/effect/timeline/arcane';
import { appendBeam, appendRaybeam } from '@axe/domain/effect/timeline/beam';
import { appendBisect, appendSkyblade, appendSlash } from '@axe/domain/effect/timeline/blade';
import { appendDissolve, appendGore } from '@axe/domain/effect/timeline/body';
import { appendBreath, appendDrain } from '@axe/domain/effect/timeline/breath';
import {
  appendArrowRain,
  appendBallistic,
  appendProjectile,
  arrowRainShots,
  projectileTiming,
} from '@axe/domain/effect/timeline/flight';
import {
  appendBash,
  appendGravity,
  appendImpact,
  appendMushroom,
  appendRubble,
  appendUpheaval,
} from '@axe/domain/effect/timeline/ground';
import {
  type EffectSprite,
  type EffectSpriteOptions,
  imageOf,
  type ImpactPainter,
  type Point3,
  projectileOrigin,
  seededRandom,
} from '@axe/domain/effect/timeline/shared';

/**
 * 盤面に置く「線で描く」要素を組み立てる。
 *
 * 光る粒・炎・煙は canvas 側（`effect-particles`）が加算合成で描く。ここが受け持つのは
 * 魔法陣・衝撃波の輪・地割れ・稲妻・刃・氷柱のように、輪郭がはっきりしている方が
 * 良いものだけ。地面に寝かせる要素は SVG のままの方が拡大しても崩れない。
 *
 * 演出そのものは `timeline/` 配下に家族ごとに置く。ここは**どれを呼ぶか**だけを持つ。
 */

export { EXCALIBUR_SWING_END, type SlashHit, slashHits, swingTiltOf } from '@axe/domain/effect/timeline/blade';
export {
  ARROW_RAIN_FALL,
  type ArrowRainShot,
  arrowRainShots,
  BALLISTIC_DIVE_END,
  type ProjectileShot,
  projectileTiming,
} from '@axe/domain/effect/timeline/flight';
export {
  type EffectSprite,
  type EffectSpriteOptions,
  type Point3,
  seededRandom,
} from '@axe/domain/effect/timeline/shared';

/** 着弾音が潰し合わないよう空ける最短間隔。 */
const IMPACT_SOUND_MIN_GAP_MS = 70;
/** 降り注ぐものの音の間隔。1 本ごとに鳴らすと連続音になって本数が聞き取れない。 */
const RAIN_SOUND_MIN_GAP_MS = 110;

/** 発射音が潰し合わないよう空ける最短間隔。連射の刻みが聞こえる程度には詰める。 */
const LAUNCH_SOUND_MIN_GAP_MS = 55;

export function isEffectFinished(preset: EffectPreset, cast: EffectCast, elapsedMs: number): boolean {
  return elapsedMs >= preset.totalDuration(cast.targets.length);
}

/**
 * 着弾音を鳴らす時刻(ms)。
 * 連射は弾ごとに鳴らす。1 回だけだと、弾幕なのに着弾が 1 発に聞こえる。
 * ただし細かすぎる連続は同じ音が潰し合うので、最短間隔を空ける。
 */
export function impactSoundTimes(preset: EffectPreset): number[] {
  if (preset.impactSoundIdentifier.length < 1) return [];
  if (preset.effectKind === 'arrowrain')
    return soundTimesOf(
      arrowRainShots().map((shot) => shot.land),
      preset
    );
  if (preset.effectKind !== 'projectile') return [Math.round(preset.duration * preset.impactSoundAt)];

  const times: number[] = [];
  for (const shot of projectileTiming(preset).shots) {
    const at = Math.round(shot.land * preset.duration);
    if (times.length > 0 && at - times[times.length - 1] < IMPACT_SOUND_MIN_GAP_MS) continue;
    times.push(at);
  }
  return times;
}

/**
 * 発射音を鳴らす時刻(ms)。連射は撃つたびに鳴らさないと弾数が耳に伝わらない。
 * 1 発目は再生開始と同時なので 0 を含む。
 */
export function launchSoundTimes(preset: EffectPreset): number[] {
  if (preset.soundIdentifier.length < 1) return [];
  if (preset.effectKind === 'arrowrain')
    return soundTimesOf(
      arrowRainShots().map((shot) => shot.loose),
      preset
    );
  if (preset.effectKind !== 'projectile') return [0];

  const times: number[] = [];
  for (const shot of projectileTiming(preset).shots) {
    const at = Math.round(shot.launch * preset.duration);
    if (times.length > 0 && at - times[times.length - 1] < LAUNCH_SOUND_MIN_GAP_MS) continue;
    times.push(at);
  }
  return times.length > 0 ? times : [0];
}

/** 矢の雨のように本数の多いものを、聞き取れる間隔まで間引いた時刻(ms)。 */
function soundTimesOf(positions: readonly number[], preset: EffectPreset): number[] {
  const times: number[] = [];
  for (const position of positions) {
    const at = Math.round(position * preset.duration);
    if (times.length > 0 && at - times[times.length - 1] < RAIN_SOUND_MIN_GAP_MS) continue;
    times.push(at);
  }
  return times;
}

/** 対象ごとの再生位置。canvas 層と共有する。 */
export function effectTargetProgress(preset: EffectPreset, elapsedMs: number, index: number): number {
  return (elapsedMs - preset.stagger * index) / preset.duration;
}

export function effectTargetCenter(
  target: EffectCastTarget,
  preset: EffectPreset,
  options: EffectSpriteOptions
): Point3 {
  if (!preset.followTarget || target.identifier.length < 1) return target;
  return options.resolvePosition?.(target.identifier) ?? target;
}

/** 的の周りで完結する演出。飛び道具や刃は、当たった先をここへ委ねる。 */
const CENTERED: Partial<Record<EffectKind, (ctx: CenteredContext) => void>> = {
  slash: (c) => appendSlash(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  flame: (c) => appendFlame(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  heal: (c) => appendHeal(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  impact: (c) => appendImpact(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random),
  rubble: (c) => appendRubble(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random),
  upheaval: (c) => appendUpheaval(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random),
  mushroom: (c) => appendMushroom(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  bolt: (c) => appendBolt(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random),
  frost: (c) => appendFrost(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random),
  nova: (c) => appendNova(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  vortex: (c) => appendVortex(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  miasma: (c) => appendMiasma(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  aura: (c) => appendAura(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  barrier: (c) => appendBarrier(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  bash: (c) => appendBash(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  curse: (c) => appendCurse(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  warp: (c) => appendWarp(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
  gravity: (c) => appendGravity(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset),
};

/** 撃ち手から的へ向かう演出。中心だけでは描けず、出どころと向きが要る。 */
const AIMED: Partial<Record<EffectKind, (ctx: AimedContext) => void>> = {
  arc: (c) => appendArc(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.random, c.view),
  dissolve: (c) =>
    appendDissolve(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random, imageOfTarget(c)),
  gore: (c) => appendGore(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random),
  bisect: (c) => appendBisect(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, c.random, imageOfTarget(c)),
  ballistic: (c) =>
    appendBallistic(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view, paintCentered),
  arrowrain: (c) =>
    appendArrowRain(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.random, c.view),
  skyblade: (c) =>
    appendSkyblade(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view, paintCentered),
  raybeam: (c) => appendRaybeam(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view),
  beam: (c) => appendBeam(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view),
  breath: (c) => appendBreath(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view),
  drain: (c) => appendDrain(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view),
  projectile: (c) =>
    appendProjectile(c.sprites, c.prefix, c.center, c.base, c.progress, c.preset, originOf(c), c.view, paintCentered),
};

interface CenteredContext {
  sprites: EffectSprite[];
  prefix: string;
  center: Point3;
  base: number;
  progress: number;
  preset: EffectPreset;
  random: () => number;
}

/**
 * 狙って撃つ演出に渡すもの。
 *
 * 出どころと立ち絵は**要るときだけ** `originOf` / `imageOfTarget` で求める。立ち絵の取り出しは
 * 持ち物の中を辿るので、毎フレーム・的の数だけ先に払うと高くつく。使うのは 4 種類だけ。
 */
interface AimedContext extends CenteredContext {
  cast: EffectCast;
  target: EffectCastTarget;
  options: EffectSpriteOptions;
  view: ViewRotation | null | undefined;
}

function originOf(context: AimedContext): Point3 {
  return projectileOrigin(context.cast, context.center, context.base);
}

function imageOfTarget(context: AimedContext): string {
  return imageOf(context.options, context.target.identifier);
}

/** 出どころと向きが要る種類。表に無いものは的の周りで完結する扱いになる。 */
export const AIMED_EFFECT_KINDS: readonly EffectKind[] = Object.keys(AIMED) as EffectKind[];

/** 的の周りで完結する種類。ここにも無い種類は、弾けさせて済ませる。 */
export const CENTERED_EFFECT_KINDS: readonly EffectKind[] = Object.keys(CENTERED) as EffectKind[];

export function effectSprites(
  preset: EffectPreset,
  cast: EffectCast,
  elapsedMs: number,
  options: EffectSpriteOptions
): EffectSprite[] {
  const sprites: EffectSprite[] = [];
  const base = Math.max(options.baseSize, 1) * preset.sizeScale;

  cast.targets.forEach((target, index) => {
    if (options.hiddenIdentifiers?.has(target.identifier)) return;

    const progress = effectTargetProgress(preset, elapsedMs, index);
    if (progress < 0 || progress > 1) return;

    const center = effectTargetCenter(target, preset, options);
    const context: AimedContext = {
      sprites,
      prefix: `${index}`,
      center,
      base,
      progress,
      preset,
      random: seededRandom(cast.seed + index * 7919),
      cast,
      target,
      options,
      view: options.viewRotation,
    };

    const aimed = AIMED[preset.effectKind];
    if (aimed) {
      aimed(context);
      return;
    }
    paintCentered(preset.effectKind, sprites, context.prefix, center, base, progress, preset, context.random);
  });

  return sprites;
}

/** 覚えのない種類は弾けさせる。新しい種類を足しても、まず何かは出る。 */
const paintCentered: ImpactPainter = (kind, sprites, prefix, center, base, progress, preset, random) => {
  const centered = CENTERED[kind];
  const context: CenteredContext = { sprites, prefix, center, base, progress, preset, random };
  if (centered) {
    centered(context);
    return;
  }
  appendBurst(sprites, prefix, center, base, progress, preset);
};
