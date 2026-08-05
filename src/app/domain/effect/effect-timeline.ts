import { EffectCast, EffectCastTarget } from '@axe/domain/effect/effect-cast';
import { EffectKind, ProjectileStyle, SlashStyle } from '@axe/domain/effect/effect-kind';
import { EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  arrowSvg,
  barrierSvg,
  boltSvg,
  bulletSvg,
  crackSvg,
  crescentSvg,
  gravitySvg,
  impactStarSvg,
  magicCircleSvg,
  ringSvg,
  ShapeColors,
  snowflakeSvg,
  speedLinesSvg,
  spikeSvg,
  spiralSvg,
} from '@axe/domain/effect/effect-shapes';
import { projectDirection, ViewRotation } from '@axe/domain/effect/effect-view';

/**
 * 盤面に置く「線で描く」要素を組み立てる。
 *
 * 光る粒・炎・煙は canvas 側（`effect-particles`）が加算合成で描く。ここが受け持つのは
 * 魔法陣・衝撃波の輪・地割れ・稲妻・刃・氷柱のように、輪郭がはっきりしている方が
 * 良いものだけ。地面に寝かせる要素は SVG のままの方が拡大しても崩れない。
 */

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
}

interface Point3 {
  x: number;
  y: number;
  z: number;
}

const FLARE_SPIKE_COUNT = 4;
const BOLT_SEGMENT_COUNT = 9;
const BOLT_BRANCH_COUNT = 3;
/** 稲妻本体が出ている区間。CSS アニメーションの長さもこれに合わせる。 */
const BOLT_STRIKE_END = 0.45;
const FROST_SHARD_COUNT = 8;
const FROST_SPIKE_COUNT = 6;
const UPHEAVAL_SLAB_COUNT = 7;
const BREATH_SEGMENT_COUNT = 10;
/** 口元から対象まで届くまで。 */
const BREATH_REACH_END = 0.3;
/** 息が切れはじめる位置。 */
const BREATH_RELEASE_AT = 0.74;
const BREATH_LOBE_COUNT = 8;
const BREATH_SPLASH_ANGLES = [-64, -34, 0, 34, 64];
/** 円錐の層。外は薄く広く、芯は白熱して先へ行くほど冷める。 */
const BREATH_LAYERS = [
  { key: 'haze', width: 1.45, opacity: 0.3, fade: 0.15 },
  { key: 'body', width: 1, opacity: 0.72, fade: 0.3 },
  { key: 'core', width: 0.42, opacity: 0.95, fade: 0.72 },
];
const DRAIN_MOTE_COUNT = 10;
const CURSE_RING_COUNT = 3;
const ARC_NODE_COUNT = 10;
/** レーザーが溜めを終えて発射する位置。 */
const BEAM_CHARGE_END = 0.28;
/** 溜めの終わり際、光を一度潰す位置。ここで撃つ前の「タメ」が生まれる。 */
const BEAM_SNAP_AT = 0.76;
/** 撃ってから柱が対象へ届くまで。レーザーは伸びるのではなく通る。 */
const BEAM_REACH_END = 0.09;
/** 第 2 波が乗る位置。全力を頭から出さず、後から重ねて増幅して見せる。 */
const BEAM_SWELL_AT = 0.32;
/** 柱が根元から引き上がりはじめる位置。 */
const BEAM_RELEASE_AT = 0.8;
const BEAM_SEGMENT_COUNT = 10;
const BEAM_CHARGE_RINGS = 3;
const BEAM_SURGE_COUNT = 3;
const BEAM_RING_COUNT = 3;
const BEAM_HELIX_DASHES = 6;
/** 着弾点から跳ね返る飛沫の向き(度)。 */
const BEAM_SPLASH_ANGLES = [-56, -33, -12, 11, 34, 57];
/**
 * 柱の層。外から内へ、広く淡く → 細く白熱。
 * `edge` がシルエットを立て、`wobble` が層ごとに違うことで一様な棒に見えなくなる。
 */
const BEAM_LAYERS = [
  { key: 'halo', width: 2.5, opacity: 0.22, wobble: 0.17 },
  { key: 'edge', width: 1.5, opacity: 0.52, wobble: 0.12 },
  { key: 'body', width: 0.95, opacity: 0.9, wobble: 0.07 },
  { key: 'core', width: 0.3, opacity: 1, wobble: 0.03 },
];
/** 柱に巻き付く帯。半周ずらした 2 条で始まり、増幅後にさらに 2 条が乗る。 */
const BEAM_HELIX_STRANDS = [
  { phase: 0, late: false },
  { phase: Math.PI, late: false },
  { phase: Math.PI / 2, late: true },
  { phase: (Math.PI * 3) / 2, late: true },
];
/** 放電が走っている区間。 */
const ARC_STRIKE_END = 0.4;
const ARC_LAYERS = [
  { key: 'aura', width: 0.26, opacity: 0.5 },
  { key: 'core', width: 0.08, opacity: 1 },
];
/** 斬撃の刀身。型ごとに手数・角度・間合いが変わる。 */
export interface SlashHit {
  /** 再生位置のどこで斬るか(0-1)。 */
  at: number;
  /** 1 太刀にかける長さ(0-1)。 */
  span: number;
  angle: number;
  thickness: number;
  offsetX: number;
  offsetY: number;
  reach: number;
}

const SLASH_ANGLES = [-46, 34, -18, 52, -8, 26];
const SLASH_SHIFTS = [-0.34, 0.3, 0.12, -0.26, 0.36, -0.12];
/** 溜めが終わる位置。ここで斬る。 */
const SLASH_CHARGE_END = 0.42;
const SLASH_CHARGE_COUNT = 6;
const SLASH_CRACK_JITTER = [0.2, 0.7, 0.35, 0.85, 0.5, 0.15];
/** 居合が閃く位置。ここまでは何も起きない。 */
const SLASH_IAI_AT = 0.55;

/**
 * 型ごとの太刀筋。
 * 居合は「静止 → 一瞬 → 斬り口」、唐竹割りは真上から、薙ぎ払いは横へ大きく。
 */
export function slashHits(style: SlashStyle): SlashHit[] {
  switch (style) {
    case 'combo': {
      const span = 0.3;
      const step = (1 - span) / 4;
      return Array.from({ length: 5 }, (_unused, index) => ({
        at: step * index,
        span,
        angle: SLASH_ANGLES[index % SLASH_ANGLES.length],
        thickness: 18,
        offsetX: SLASH_SHIFTS[index % SLASH_SHIFTS.length],
        offsetY: SLASH_SHIFTS[(index + 2) % SLASH_SHIFTS.length] * 0.6,
        reach: 2.2,
      }));
    }
    case 'iai':
      // 抜き打ちの一瞬。長く薄く、水平に近い一線。
      return [{ at: SLASH_IAI_AT, span: 0.1, angle: -6, thickness: 8, offsetX: 0, offsetY: 0, reach: 5.4 }];
    case 'wide':
      // 薙ぎ払い。横へ大きく、厚く。
      return [{ at: SLASH_CHARGE_END, span: 0.34, angle: -14, thickness: 46, offsetX: 0, offsetY: 0, reach: 5 }];
    case 'heavy':
      // 唐竹割り。真上から振り下ろす。
      return [{ at: SLASH_CHARGE_END, span: 0.26, angle: -88, thickness: 42, offsetX: 0, offsetY: -0.35, reach: 4.2 }];
    default:
      return [{ at: 0, span: 0.85, angle: -46, thickness: 28, offsetX: 0, offsetY: 0, reach: 3 }];
  }
}

/**
 * 弾が飛んでいる時間(ms)。再生時間に対する割合ではなく実時間で決める。
 * 割合にすると、連射のように尺の長いものほど弾が遅くなってしまう。
 */
const PROJECTILE_TRAVEL_MS: Record<ProjectileStyle, number> = { bullet: 130, arrow: 260, bolt: 340 };

/** 着弾音が潰し合わないよう空ける最短間隔。 */
const IMPACT_SOUND_MIN_GAP_MS = 70;

export interface ProjectileShot {
  /** 撃ち出す位置(0-1)。 */
  launch: number;
  /** 着弾する位置(0-1)。 */
  land: number;
}

/**
 * 飛翔体の刻み。最後の 1 発が終端で着弾するよう、発射を等間隔に並べる。
 * 弾ごとに独立して飛ぶので、機関銃は弾幕として見える。
 */
export function projectileTiming(preset: EffectPreset): { travel: number; shots: ProjectileShot[] } {
  const travel = Math.min(Math.max(PROJECTILE_TRAVEL_MS[preset.projectileLook] / preset.duration, 0.05), 0.6);
  const count = preset.shotCount;
  if (count === 1) return { travel, shots: [{ launch: 0, land: travel }] };

  // 連射は「1 秒あたり何発か」で決める。尺へ均等に散らすと、
  // 発射音が鳴り終わったあとも延々と撃ち続けることになる。
  const even = (1 - travel) / (count - 1);
  const wanted = preset.shotIntervalMs > 0 ? preset.shotIntervalMs / preset.duration : even;
  const gap = Math.min(wanted, even);

  return {
    travel,
    shots: Array.from({ length: count }, (_unused, index) => ({
      launch: gap * index,
      land: gap * index + travel,
    })),
  };
}
const PROJECTILE_RIBBON_COUNT = 7;
const AURA_PULSE_COUNT = 3;
const AURA_SPIKE_COUNT = 6;
const HEAL_RING_COUNT = 3;

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
  if (preset.effectKind !== 'projectile') return [Math.round(preset.duration * preset.impactSoundAt)];

  const times: number[] = [];
  for (const shot of projectileTiming(preset).shots) {
    const at = Math.round(shot.land * preset.duration);
    if (times.length > 0 && at - times[times.length - 1] < IMPACT_SOUND_MIN_GAP_MS) continue;
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
    const random = seededRandom(cast.seed + index * 7919);
    const prefix = `${index}`;

    if (preset.effectKind === 'arc') {
      appendArc(
        sprites,
        prefix,
        center,
        base,
        progress,
        preset,
        projectileOrigin(cast, center, base),
        random,
        options.viewRotation
      );
      return;
    }
    if (preset.effectKind === 'beam') {
      appendBeam(
        sprites,
        prefix,
        center,
        base,
        progress,
        preset,
        projectileOrigin(cast, center, base),
        options.viewRotation
      );
      return;
    }
    if (preset.effectKind === 'breath') {
      appendBreath(
        sprites,
        prefix,
        center,
        base,
        progress,
        preset,
        projectileOrigin(cast, center, base),
        options.viewRotation
      );
      return;
    }
    if (preset.effectKind === 'drain') {
      appendDrain(
        sprites,
        prefix,
        center,
        base,
        progress,
        preset,
        projectileOrigin(cast, center, base),
        options.viewRotation
      );
      return;
    }
    if (preset.effectKind === 'projectile') {
      appendProjectile(
        sprites,
        prefix,
        center,
        base,
        progress,
        preset,
        projectileOrigin(cast, center, base),
        options.viewRotation
      );
      return;
    }
    appendKind(preset.effectKind, sprites, prefix, center, base, progress, preset, random);
  });

  return sprites;
}

function appendKind(
  kind: EffectKind,
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  switch (kind) {
    case 'slash':
      appendSlash(sprites, prefix, center, base, progress, preset);
      break;
    case 'flame':
      appendFlame(sprites, prefix, center, base, progress, preset);
      break;
    case 'heal':
      appendHeal(sprites, prefix, center, base, progress, preset);
      break;
    case 'impact':
      appendImpact(sprites, prefix, center, base, progress, preset, random);
      break;
    case 'rubble':
      appendRubble(sprites, prefix, center, base, progress, preset, random);
      break;
    case 'upheaval':
      appendUpheaval(sprites, prefix, center, base, progress, preset, random);
      break;
    case 'mushroom':
      appendMushroom(sprites, prefix, center, base, progress, preset);
      break;
    case 'bolt':
      appendBolt(sprites, prefix, center, base, progress, preset, random);
      break;
    case 'frost':
      appendFrost(sprites, prefix, center, base, progress, preset, random);
      break;
    case 'nova':
      appendNova(sprites, prefix, center, base, progress, preset);
      break;
    case 'vortex':
      appendVortex(sprites, prefix, center, base, progress, preset);
      break;
    case 'miasma':
      appendMiasma(sprites, prefix, center, base, progress, preset);
      break;
    case 'aura':
      appendAura(sprites, prefix, center, base, progress, preset);
      break;
    case 'barrier':
      appendBarrier(sprites, prefix, center, base, progress, preset);
      break;
    case 'bash':
      appendBash(sprites, prefix, center, base, progress, preset);
      break;
    case 'curse':
      appendCurse(sprites, prefix, center, base, progress, preset);
      break;
    case 'warp':
      appendWarp(sprites, prefix, center, base, progress, preset);
      break;
    case 'gravity':
      appendGravity(sprites, prefix, center, base, progress, preset);
      break;
    default:
      appendBurst(sprites, prefix, center, base, progress, preset);
      break;
  }
}

/** 加算合成を使わないぶん、光り方は box-shadow の広がりで作る。 */
function glow(innerRadius: number, innerColor: string, outerRadius?: number, outerColor?: string): string {
  const inner = `0 0 ${Math.round(innerRadius * 1.4)}px ${innerColor}`;
  if (outerRadius == null || outerColor == null) return inner;
  return `${inner}, 0 0 ${Math.round(outerRadius * 1.4)}px ${outerColor}`;
}

function colorsOf(preset: EffectPreset): ShapeColors {
  return { core: preset.colorPrimary, edge: preset.colorSecondary };
}

/** 中心から四方に伸びる光の筋。アニメ調の閃光に欠かせない。 */
function appendFlareSpikes(
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

/** 発射元。指定が無ければ対象の斜め上から飛んでくる扱いにする。 */
function projectileOrigin(cast: EffectCast, center: Point3, base: number): Point3 {
  if (cast.origin) return cast.origin;
  return { x: center.x - base * 4, y: center.y - base * 4, z: center.z + base * 4 };
}

/**
 * 飛翔体。発射 → 飛翔 → 着弾の 3 段で組む。
 *
 * 飛翔中は「速度方向へ引き伸ばした頭」と「位置を繋いだ帯（リボン）」を出す。
 * 丸い粒を等間隔に並べても速度が出ないので、画面上の進行方向へ潰す・伸ばすのが要点。
 */
function appendProjectile(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined
): void {
  const look = preset.projectileLook;
  const solid = look !== 'bolt';
  const arc = look === 'arrow' ? base * 1.1 : base * 0.15;
  const timing = projectileTiming(preset);

  // 弾ごとに撃つ・飛ぶ・当たるが独立する。連射はこれを前へ詰めて並べたもの。
  timing.shots.forEach((shot, index) => {
    const travel = normalize((progress - shot.launch) / timing.travel);
    const shotKey = `${prefix}-s${index}`;

    if (travel > 0 && travel < 1) {
      appendFlyingShot(sprites, shotKey, center, base, travel, preset, origin, view, arc, look);
    }

    appendLaunchFlash(sprites, shotKey, base, travel, preset, origin, solid);

    const impact = normalize((progress - shot.land) / (1 - shot.land));
    if (impact > 0 && impact < 1) {
      // 着弾は属性ごとの演出へ委譲する。氷なら霜の輪、土なら地割れが出る。
      appendKind(preset.impactEffectKind, sprites, `${shotKey}-impact`, center, base * 0.85, impact, preset, () => 0.5);
    }
  });
}

/** 飛んでいる 1 発。速度方向へ引き伸ばした頭と、位置を繋いだ帯。 */
function appendFlyingShot(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  travel: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined,
  arc: number,
  look: 'bolt' | 'arrow' | 'bullet'
): void {
  const solid = look !== 'bolt';
  const at = (value: number): Point3 => flightPoint(origin, center, base, value, arc);
  const head = at(travel);

  // 帯。隣り合う 2 点を結ぶので、折れずに繋がった軌跡になる。
  const span = solid ? 0.05 : 0.075;
  for (let segment = 0; segment < PROJECTILE_RIBBON_COUNT; segment++) {
    const back = at(travel - (segment + 1) * span);
    const front = at(travel - segment * span);
    const link = projectDirection(front.x - back.x, front.y - back.y, front.z - back.z, view);
    if (link.length < 0.5) continue;
    const age = segment / PROJECTILE_RIBBON_COUNT;
    sprites.push({
      ...blank(),
      key: `${prefix}-ribbon-${segment}`,
      x: (front.x + back.x) / 2,
      y: (front.y + back.y) / 2,
      z: (front.z + back.z) / 2,
      width: link.length * 1.08,
      height: base * (solid ? 0.1 : 0.34) * (1 - age * 0.75),
      rotate: link.angle,
      opacity: (1 - age) * (1 - age) * (solid ? 0.5 : 0.85),
      background: solid
        ? `linear-gradient(90deg, transparent, ${preset.colorSecondary})`
        : `linear-gradient(90deg, transparent, ${preset.colorSecondary} 35%, ${preset.colorPrimary} 85%, #ffffff)`,
      borderRadius: '50%',
      shadow: solid ? '' : glow(base * 0.2 * (1 - age), preset.colorSecondary),
    });
  }

  // 頭。速度方向へ引き伸ばすことで、止め絵でも速く見える。
  const nose = at(travel - 0.02);
  const heading = projectDirection(head.x - nose.x, head.y - nose.y, head.z - nose.z, view);
  if (solid) {
    sprites.push({
      ...blank(),
      key: `${prefix}-shot`,
      x: head.x,
      y: head.y,
      z: head.z,
      width: base * (look === 'arrow' ? 1.8 : 1.25),
      height: base * (look === 'arrow' ? 0.36 : 0.22),
      rotate: heading.angle,
      svg: look === 'arrow' ? arrowSvg(colorsOf(preset)) : bulletSvg(colorsOf(preset)),
    });
    return;
  }

  sprites.push({
    ...blank(),
    key: `${prefix}-streak`,
    x: head.x,
    y: head.y,
    z: head.z,
    width: base * 1.9,
    height: base * 0.5,
    rotate: heading.angle,
    opacity: 0.95,
    background: `linear-gradient(90deg, transparent, ${preset.colorSecondary} 30%, ${preset.colorPrimary} 65%, #ffffff 100%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.5, preset.colorPrimary, base * 1.1, preset.colorSecondary),
  });

  const coreSize = base * 0.52;
  sprites.push({
    ...blank(),
    key: `${prefix}-core`,
    x: head.x,
    y: head.y,
    z: head.z,
    width: coreSize,
    height: coreSize,
    opacity: 1,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 45%, ${preset.colorSecondary} 72%, transparent 84%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.7, '#ffffff', base * 1.4, preset.colorPrimary),
  });
}

/** 発射の瞬間。溜めの光と銃口炎。 */
function appendLaunchFlash(
  sprites: EffectSprite[],
  prefix: string,
  base: number,
  travel: number,
  preset: EffectPreset,
  origin: Point3,
  solid: boolean
): void {
  const flash = normalize(travel / 0.2);
  if (flash <= 0 || flash >= 1) return;

  const size = base * (solid ? 0.5 + flash * 0.7 : 1 + flash * 1.4);
  sprites.push({
    ...blank(),
    key: `${prefix}-muzzle`,
    x: origin.x,
    y: origin.y,
    z: origin.z,
    width: size,
    height: size,
    opacity: (1 - flash) * 0.95,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 40%, ${preset.colorSecondary} 62%, transparent 78%)`,
    borderRadius: '50%',
  });

  if (solid) return;
  for (let spike = 0; spike < 2; spike++) {
    sprites.push({
      ...blank(),
      key: `${prefix}-muzzle-flare-${spike}`,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      width: base * (1.4 + flash * 1.6),
      height: base * 0.09 * (1 - flash),
      rotate: spike * 90,
      opacity: (1 - flash) * 0.85,
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 35%, #ffffff 50%, ${preset.colorPrimary} 65%, transparent)`,
      borderRadius: '50%',
    });
  }
}

/** 経路上の 1 点。`arc` を与えると山なりに飛ぶ。 */
function flightPoint(origin: Point3, center: Point3, base: number, value: number, arc: number): Point3 {
  const clamped = Math.min(Math.max(value, 0), 1);
  // わずかに加速させる。等速だと矢というより漂う光になる。
  const eased = clamped ** 1.25;
  return {
    x: origin.x + (center.x - origin.x) * eased,
    y: origin.y + (center.y - origin.y) * eased,
    z: origin.z + (center.z + base * 0.6 - origin.z) * eased + Math.sin(Math.PI * clamped) * arc,
  };
}

/**
 * 極太ビーム。溜め → 潰し → 貫通 → 増幅 → 引き上げ。
 *
 * 砲口から対象まで、経路上に並べた区間で 1 本の柱にする。
 * 区間ごとに自分の奥行きを持つので、間に立つコマと正しく前後する。
 *
 * 柱を等幅の棒で描くと、どれだけ光らせても板に見える。層でシルエットを立て、
 * 区間ごとのうねり・巻き付く帯・走る輪・跳ね返る飛沫で「流れている」ことを見せる。
 */
function appendBeam(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined
): void {
  const muzzle = { x: origin.x, y: origin.y, z: origin.z + base * 0.2 };
  const impact = { x: center.x, y: center.y, z: center.z + base * 0.6 };
  const link = projectDirection(impact.x - muzzle.x, impact.y - muzzle.y, impact.z - muzzle.z, view);
  const radians = (link.angle * Math.PI) / 180;
  // 板ポリ面内での「柱を横切る向き」。帯と輪はここへずらして巻き付ける。
  const acrossX = -Math.sin(radians);
  const acrossY = Math.cos(radians);
  const colors = colorsOf(preset);

  if (progress < BEAM_CHARGE_END) {
    appendBeamCharge(sprites, prefix, muzzle, base, clamp01(progress / BEAM_CHARGE_END), preset, colors);
    return;
  }

  const fired = clamp01(normalize((progress - BEAM_CHARGE_END) / (1 - BEAM_CHARGE_END)));
  if (fired <= 0 || fired >= 1) return;

  const reach = Math.min(1, fired / BEAM_REACH_END);
  // 第 2 波。頭から全力を出さず、遅れて太らせるほうが威力が上がって見える。
  const swell = clamp01((fired - BEAM_SWELL_AT) / 0.2);
  const release = clamp01((fired - BEAM_RELEASE_AT) / (1 - BEAM_RELEASE_AT));
  // 根元から引き上がって消える。全体を一様に薄くすると、力尽きた感じが出ない。
  const foot = release ** 1.7;
  const swing = 1 + Math.sin(progress * 44) * 0.05;
  // 近距離では細める。間合いが詰まっていると、太さが長さを追い越して塊に見える。
  const span = 0.55 + Math.min(1, link.length / (base * 7)) * 0.45;
  const girth = (1 + swell * 0.34) * swing * span;
  const alive = 1 - release * 0.3;

  for (let segment = 0; segment < BEAM_SEGMENT_COUNT; segment++) {
    const from = Math.max(segment / BEAM_SEGMENT_COUNT, foot);
    const to = Math.min((segment + 1) / BEAM_SEGMENT_COUNT, reach);
    if (to <= from) continue;

    const mid = (from + to) / 2;
    const anchor = pointBetween(muzzle, impact, mid);
    // 継ぎ目が出ないよう、区間はわずかに重ねる。
    const length = link.length * (to - from) + base * 0.08;
    // 着弾側をわずかに太らせる。まっすぐ等幅だと配管に見える。
    const taper = 1 + mid ** 3 * 0.28;

    for (const layer of BEAM_LAYERS) {
      // うねりは区間番号ではなく経路上の位置で決める。区間ごとに太さが飛ぶと
      // 粒を並べたように見えてしまい、1 本の筒に見えなくなる。
      const wobble = 1 + Math.sin(mid * 9.4 - progress * 34) * layer.wobble;
      sprites.push({
        ...blank(),
        key: `${prefix}-beam-${segment}-${layer.key}`,
        x: anchor.x,
        y: anchor.y,
        z: anchor.z,
        width: length,
        height: base * layer.width * girth * wobble * taper,
        rotate: link.angle,
        opacity: layer.opacity * alive,
        background: beamPaint(layer.key, preset),
        // 端を丸めない。区間ごとに丸めると数珠つなぎになる。
        // 縁のやわらかさは層の縦グラデーションが受け持つ。
        borderRadius: '0',
        shadow: layer.key === 'core' ? glow(base * 0.5, '#ffffff', base * 1.4, preset.colorPrimary) : '',
      });
    }
  }

  // 柱に巻き付く帯。手前側を明るく大きくして、丸い柱に見せる。
  for (let strand = 0; strand < BEAM_HELIX_STRANDS.length; strand++) {
    const strength = BEAM_HELIX_STRANDS[strand].late ? swell : 1;
    if (strength <= 0) continue;

    for (let dash = 0; dash < BEAM_HELIX_DASHES; dash++) {
      const at = (dash + 0.5) / BEAM_HELIX_DASHES;
      if (at < foot || at > reach) continue;

      const phase = BEAM_HELIX_STRANDS[strand].phase + at * Math.PI * 3.2 - progress * 15;
      const face = Math.cos(phase);
      const shift = Math.sin(phase) * base * 0.95 * girth;
      const anchor = pointBetween(muzzle, impact, at);
      sprites.push({
        ...blank(),
        key: `${prefix}-beam-helix-${strand}-${dash}`,
        x: anchor.x,
        y: anchor.y,
        z: anchor.z,
        offsetX: acrossX * shift,
        offsetY: acrossY * shift,
        width: base * (0.75 + face * 0.15),
        height: base * 0.2 * girth,
        // 帯が柱を横切るところが最も斜めになる。傾きは奥行きと同じ位相で動く。
        rotate: link.angle + face * 24,
        opacity: alive * strength * (0.3 + Math.max(face, 0) * 0.55),
        background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 30%, #ffffff 55%, transparent)`,
        borderRadius: '50%',
      });
    }
  }

  // 柱を走る輪。エネルギーが砲口から着弾へ流れていることが読める。
  for (let ring = 0; ring < BEAM_RING_COUNT; ring++) {
    const at = ((progress * 1.7 + ring / BEAM_RING_COUNT) % 1) * reach;
    if (at < foot) continue;
    const anchor = pointBetween(muzzle, impact, at);
    sprites.push({
      ...blank(),
      key: `${prefix}-beam-ring-${ring}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      width: base * 0.44,
      height: base * (2.4 + swell) * girth * (0.85 + at * 0.4),
      rotate: link.angle,
      opacity: alive * 0.45,
      svg: ringSvg(colors, 11),
    });
  }

  // 芯を流れる奔流。輪より速く走らせて、内側と外側で速度差を作る。
  for (let surge = 0; surge < BEAM_SURGE_COUNT; surge++) {
    const at = ((progress * 3.1 + surge / BEAM_SURGE_COUNT) % 1) * reach;
    if (at < foot) continue;
    const anchor = pointBetween(muzzle, impact, at);
    sprites.push({
      ...blank(),
      key: `${prefix}-beam-surge-${surge}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      width: base * 2.6,
      height: base * 0.46 * girth,
      rotate: link.angle,
      opacity: alive * 0.85,
      // 進行方向に長く尾を引かせる。丸い塊にすると柱の中を玉が転がって見える。
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 45%, #ffffff 72%, transparent)`,
      borderRadius: '0',
    });
  }

  appendBeamMuzzle(sprites, prefix, muzzle, base, progress, preset, girth, alive, release);
  if (reach >= 1 && release < 1) {
    appendBeamImpact(sprites, prefix, center, impact, base, progress, preset, colors, link.angle, girth, alive);
  }
}

/** 溜め。砲口へ光が集まり、輪が締まり、最後にいったん潰れて撃つ。 */
function appendBeamCharge(
  sprites: EffectSprite[],
  prefix: string,
  muzzle: Point3,
  base: number,
  charge: number,
  preset: EffectPreset,
  colors: ShapeColors
): void {
  // 潰し。膨らみきった光を一度小さくすると、次の瞬間の発射が強く見える。
  const snap = clamp01((charge - BEAM_SNAP_AT) / (1 - BEAM_SNAP_AT));
  const grow = clamp01(charge / BEAM_SNAP_AT);
  const orb = base * (0.4 + grow * 1.5) * (1 - snap * 0.9);
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-charge`,
    x: muzzle.x,
    y: muzzle.y,
    z: muzzle.z,
    width: orb,
    height: orb,
    opacity: Math.min(1, charge * 0.95 + snap * 0.5),
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 40%, ${preset.colorSecondary} 70%, transparent 84%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.8 * grow, preset.colorPrimary, base * 1.8 * grow, preset.colorSecondary),
  });

  for (let ring = 0; ring < BEAM_CHARGE_RINGS; ring++) {
    const local = (charge * 1.6 + ring / BEAM_CHARGE_RINGS) % 1;
    const size = base * (2.6 - local * 2.1);
    sprites.push({
      ...blank(),
      key: `${prefix}-beam-charge-ring-${ring}`,
      x: muzzle.x,
      y: muzzle.y,
      z: muzzle.z,
      width: size,
      height: size,
      opacity: charge * (1 - local) * 0.7 * (1 - snap),
      svg: ringSvg(colors, 3),
    });
  }

  if (snap <= 0) return;
  // 潰した瞬間に弾ける輪。撃つ合図になる。
  const pop = base * (0.6 + snap * 3.4);
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-snap`,
    x: muzzle.x,
    y: muzzle.y,
    z: muzzle.z,
    width: pop,
    height: pop,
    opacity: (1 - snap) * 0.9,
    svg: ringSvg(colors, 7),
  });
}

/** 砲口。丸い白熱と十字の閃光を重ね、撃っているあいだ出しつづける。 */
function appendBeamMuzzle(
  sprites: EffectSprite[],
  prefix: string,
  muzzle: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  girth: number,
  alive: number,
  release: number
): void {
  const flare = base * (1.7 + Math.sin(progress * 30) * 0.22) * girth * (1 - release * 0.7);
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-muzzle`,
    x: muzzle.x,
    y: muzzle.y,
    z: muzzle.z,
    width: flare,
    height: flare,
    opacity: alive * 0.95,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 45%, transparent 76%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.9, preset.colorPrimary, base * 2, preset.colorSecondary),
  });
  appendFlareSpikes(sprites, `${prefix}-beam-muzzle`, muzzle, base, 0.2 + release * 0.75, preset, 3.4, 0);
}

/** 着弾。柱が刺さった点で弾け、跳ね返りが撃った側へ噴き上がる。 */
function appendBeamImpact(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  impact: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  colors: ShapeColors,
  angle: number,
  girth: number,
  alive: number
): void {
  const burst = base * (2.1 + Math.sin(progress * 24) * 0.3) * girth;
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-burst`,
    x: impact.x,
    y: impact.y,
    z: impact.z,
    width: burst,
    height: burst,
    opacity: alive * 0.9,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 38%, ${preset.colorSecondary} 66%, transparent 82%)`,
    borderRadius: '50%',
    shadow: glow(base * 1.1, preset.colorPrimary, base * 2.2, preset.colorSecondary),
  });

  const star = base * (2.8 + Math.sin(progress * 17) * 0.5) * girth;
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-star`,
    x: impact.x,
    y: impact.y,
    z: impact.z,
    width: star,
    height: star,
    opacity: alive * 0.8,
    svg: impactStarSvg(colors, 8),
    animation: 'effectSpinSlow 2.4s linear infinite',
  });

  // 柱を締める輪。刺さった点が一番強いことが伝わる。
  const collar = base * (3 + Math.sin(progress * 21) * 0.6) * girth;
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-collar`,
    x: impact.x,
    y: impact.y,
    z: impact.z,
    width: base * 0.5,
    height: collar,
    rotate: angle,
    opacity: alive * 0.55,
    svg: ringSvg(colors, 9),
  });

  // 跳ね返り。当たった面で砕けた光が撃った側へ噴き返す。
  for (let splash = 0; splash < BEAM_SPLASH_ANGLES.length; splash++) {
    const wave = (progress * 3.2 + splash / BEAM_SPLASH_ANGLES.length) % 1;
    const spray = angle + 180 + BEAM_SPLASH_ANGLES[splash];
    const radians = (spray * Math.PI) / 180;
    const length = base * (0.9 + wave * 2.4);
    sprites.push({
      ...blank(),
      key: `${prefix}-beam-splash-${splash}`,
      x: impact.x,
      y: impact.y,
      z: impact.z,
      offsetX: Math.cos(radians) * length * 0.5,
      offsetY: Math.sin(radians) * length * 0.5,
      width: length,
      height: base * 0.17 * (1 - wave * 0.55),
      rotate: spray,
      opacity: alive * (1 - wave) * 0.85,
      background: `linear-gradient(90deg, #ffffff, ${preset.colorPrimary} 45%, transparent)`,
      borderRadius: '50%',
    });
  }

  const scorch = base * (1.8 + easeOutCubic(progress) * 2.2);
  sprites.push({
    ...blank(),
    key: `${prefix}-beam-scorch`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: scorch,
    height: scorch,
    opacity: alive * 0.7,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorSecondary} 40%, transparent 74%)`,
    borderRadius: '50%',
    flat: true,
  });
}

/** 層ごとの塗り。外は淡く広がり、芯は白熱して縁だけ色が残る。 */
function beamPaint(layer: string, preset: EffectPreset): string {
  if (layer === 'core')
    return `linear-gradient(180deg, ${preset.colorPrimary}, #ffffff 40%, #ffffff 60%, ${preset.colorPrimary})`;
  if (layer === 'body') {
    return `linear-gradient(180deg, ${preset.colorSecondary}, ${preset.colorPrimary} 28%, #ffffff 50%, ${preset.colorPrimary} 72%, ${preset.colorSecondary})`;
  }
  if (layer === 'edge') {
    return `linear-gradient(180deg, transparent 2%, ${preset.colorSecondary} 20%, ${preset.colorPrimary} 50%, ${preset.colorSecondary} 80%, transparent 98%)`;
  }
  return `linear-gradient(180deg, transparent, ${preset.colorSecondary} 32%, ${preset.colorPrimary} 50%, ${preset.colorSecondary} 68%, transparent)`;
}

/** 経路上の 1 点。飛翔体と違って山なりにはしない。 */
function pointBetween(from: Point3, to: Point3, at: number): Point3 {
  return {
    x: from.x + (to.x - from.x) * at,
    y: from.y + (to.y - from.y) * at,
    z: from.z + (to.z - from.z) * at,
  };
}

/**
 * 電流。発射元から対象へ、折れ曲がった放電が一瞬で走る。
 *
 * 節を画面平面の中で組む。3D の直線は画面でも直線になるので、
 * 進行方向と直交方向にずらすだけでジグザグが作れて、両端は必ず繋がる。
 */
function appendArc(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  random: () => number,
  view: ViewRotation | null | undefined
): void {
  const jitters = takeRandoms(random, ARC_NODE_COUNT + 1);
  const strike = normalize(progress / ARC_STRIKE_END);

  if (strike < 1) {
    const link = projectDirection(center.x - origin.x, center.y - origin.y, center.z + base * 0.6 - origin.z, view);
    const radians = (link.angle * Math.PI) / 180;
    const alongX = Math.cos(radians);
    const alongY = Math.sin(radians);
    const spread = base * 0.55;

    // 両端は必ず 0 にして、撃ち手と対象へ吸い付かせる。
    const nodes = Array.from({ length: ARC_NODE_COUNT + 1 }, (_unused, index) => {
      const along = index / ARC_NODE_COUNT;
      return { along: link.length * along, side: (jitters[index] - 0.5) * 2 * spread * Math.sin(along * Math.PI) };
    });

    const strikeMs = Math.round(preset.duration * ARC_STRIKE_END);
    for (let segment = 0; segment < ARC_NODE_COUNT; segment++) {
      const from = nodes[segment];
      const to = nodes[segment + 1];
      const runX = to.along - from.along;
      const runY = to.side - from.side;
      const length = Math.hypot(runX, runY);
      if (length < 0.5) continue;

      const midAlong = (from.along + to.along) / 2;
      const midSide = (from.side + to.side) / 2;
      // 進行方向は 3D 上の点で置く。節ごとに奥行きが付くので、
      // 途中のコマや名前ラベルと正しく前後する。直交方向のずれだけ面内で足す。
      const fraction = link.length > 0 ? midAlong / link.length : 0;
      const anchor = {
        x: origin.x + (center.x - origin.x) * fraction,
        y: origin.y + (center.y - origin.y) * fraction,
        z: origin.z + (center.z + base * 0.6 - origin.z) * fraction,
      };
      const offsetX = -alongY * midSide;
      const offsetY = alongX * midSide;
      const angle = link.angle + (Math.atan2(runY, runX) * 180) / Math.PI;

      for (const layer of ARC_LAYERS) {
        sprites.push({
          ...blank(),
          key: `${prefix}-arc-${segment}-${layer.key}`,
          x: anchor.x,
          y: anchor.y,
          z: anchor.z,
          offsetX,
          offsetY,
          width: length + base * 0.06,
          height: base * layer.width,
          rotate: angle,
          background:
            layer.key === 'core'
              ? `linear-gradient(180deg, ${preset.colorPrimary}, #ffffff 45%, ${preset.colorPrimary})`
              : `linear-gradient(180deg, transparent, ${preset.colorSecondary} 40%, ${preset.colorPrimary} 60%, transparent)`,
          borderRadius: '50%',
          opacity: layer.opacity,
          shadow: layer.key === 'core' ? glow(base * 0.4, '#ffffff', base * 1.1, preset.colorSecondary) : '',
          animation: `effectBoltStrike ${strikeMs}ms linear forwards`,
        });
      }
    }
  }

  const scorch = base * (1.2 + easeOutCubic(progress) * 1.8);
  sprites.push({
    ...blank(),
    key: `${prefix}-arc-scorch`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: scorch,
    height: scorch,
    opacity: (1 - progress) * 0.6,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorSecondary} 40%, transparent 74%)`,
    borderRadius: '50%',
    flat: true,
  });

  if (progress < 0.4) appendFlareSpikes(sprites, prefix, center, base, progress / 0.4, preset, 3.2, base * 0.5);
}

/**
 * ブレス。口元から対象へ、広がりながら吹き付ける。
 *
 * 丸を等間隔に並べると数珠になって「吹き付け」に見えないので、
 * 経路上の区間で 1 本の円錐を組み、縁に渦を転がして乱れを出す。
 * 区間ごとに自分の奥行きを持つので、間に立つコマと正しく前後する。
 */
function appendBreath(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined
): void {
  const mouth = { x: origin.x, y: origin.y, z: origin.z + base * 0.15 };
  const impact = { x: center.x, y: center.y, z: center.z + base * 0.5 };
  const link = projectDirection(impact.x - mouth.x, impact.y - mouth.y, impact.z - mouth.z, view);
  const radians = (link.angle * Math.PI) / 180;
  const acrossX = -Math.sin(radians);
  const acrossY = Math.cos(radians);

  // 吹き始め → 吹き続け → 息が切れる。
  const front = Math.min(1, progress / BREATH_REACH_END);
  const release = normalize((progress - BREATH_RELEASE_AT) / (1 - BREATH_RELEASE_AT));
  // 口元から順に切れる。息を止めたぶんが先へ流れていくように見える。
  const tail = clamp01(release) ** 1.4;
  const life = 1 - clamp01(release) * 0.25;
  const swell = 1 + Math.sin(progress * 17) * 0.06;

  for (let segment = 0; segment < BREATH_SEGMENT_COUNT; segment++) {
    const from = Math.max(segment / BREATH_SEGMENT_COUNT, tail);
    const to = Math.min((segment + 1) / BREATH_SEGMENT_COUNT, front);
    if (to <= from) continue;

    const mid = (from + to) / 2;
    const anchor = pointBetween(mouth, impact, mid);
    const length = link.length * (to - from) + base * 0.08;
    const spread = breathSpread(mid) * base * swell;

    for (const layer of BREATH_LAYERS) {
      sprites.push({
        ...blank(),
        key: `${prefix}-breath-${segment}-${layer.key}`,
        x: anchor.x,
        y: anchor.y,
        z: anchor.z,
        width: length,
        height: spread * layer.width,
        rotate: link.angle,
        // 芯は口元だけ白熱し、先へ行くほど散って冷める。
        opacity: life * layer.opacity * (1 - mid * layer.fade),
        background: breathPaint(layer.key, preset),
        borderRadius: '0',
      });
    }
  }

  // 縁を転がる渦。まっすぐな円錐に乱れが出て、気体らしく見える。
  for (let lobe = 0; lobe < BREATH_LOBE_COUNT; lobe++) {
    const at = (progress * 1.6 + lobe / BREATH_LOBE_COUNT) % 1;
    if (at < tail || at > front) continue;

    const spread = breathSpread(at) * base * swell;
    const side = lobe % 2 === 0 ? 1 : -1;
    const shift = side * spread * (0.34 + Math.sin(progress * 9 + lobe) * 0.12);
    const anchor = pointBetween(mouth, impact, at);
    const size = spread * (0.5 + at * 0.25);
    sprites.push({
      ...blank(),
      key: `${prefix}-breath-lobe-${lobe}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      offsetX: acrossX * shift,
      offsetY: acrossY * shift,
      width: size,
      height: size,
      opacity: life * (0.5 - at * 0.28),
      background: `radial-gradient(circle, ${preset.colorPrimary} 0%, ${preset.colorSecondary} 55%, transparent 76%)`,
      borderRadius: '50%',
    });
  }

  if (tail <= 0) {
    const flare = base * (0.7 + Math.sin(progress * 21) * 0.1);
    sprites.push({
      ...blank(),
      key: `${prefix}-breath-mouth`,
      x: mouth.x,
      y: mouth.y,
      z: mouth.z,
      width: flare,
      height: flare,
      opacity: life * 0.9,
      background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 45%, transparent 78%)`,
      borderRadius: '50%',
      shadow: glow(base * 0.5, preset.colorPrimary),
    });
  }

  if (front >= 1) {
    // 当たった面で気体が割れて、撃った側へ巻き返す。
    for (let splash = 0; splash < BREATH_SPLASH_ANGLES.length; splash++) {
      const wave = (progress * 2.1 + splash / BREATH_SPLASH_ANGLES.length) % 1;
      const spray = link.angle + 180 + BREATH_SPLASH_ANGLES[splash];
      const sprayRadians = (spray * Math.PI) / 180;
      const reach = base * (0.6 + wave * 2);
      sprites.push({
        ...blank(),
        key: `${prefix}-breath-splash-${splash}`,
        x: impact.x,
        y: impact.y,
        z: impact.z,
        offsetX: Math.cos(sprayRadians) * reach * 0.5,
        offsetY: Math.sin(sprayRadians) * reach * 0.5,
        width: reach,
        height: base * 0.5 * (1 - wave * 0.5),
        rotate: spray,
        opacity: life * (1 - wave) * 0.5,
        background: `linear-gradient(90deg, ${preset.colorPrimary}, ${preset.colorSecondary} 55%, transparent)`,
        borderRadius: '50%',
      });
    }
  }

  const scorch = base * (1 + easeOutCubic(progress) * 1.6);
  sprites.push({
    ...blank(),
    key: `${prefix}-breath-scorch`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: scorch,
    height: scorch,
    opacity: life * 0.5,
    background: `radial-gradient(circle, ${preset.colorSecondary} 0%, transparent 72%)`,
    borderRadius: '50%',
    flat: true,
  });
}

/** 口元から先端へ向かう広がり。根元は細く、先ほど大きく散る。 */
function breathSpread(at: number): number {
  return 0.4 + at ** 0.8 * 2.1;
}

function breathPaint(layer: string, preset: EffectPreset): string {
  if (layer === 'core') {
    return `linear-gradient(180deg, transparent, ${preset.colorPrimary} 22%, #ffffff 50%, ${preset.colorPrimary} 78%, transparent)`;
  }
  if (layer === 'body') {
    return `linear-gradient(180deg, transparent, ${preset.colorSecondary} 16%, ${preset.colorPrimary} 50%, ${preset.colorSecondary} 84%, transparent)`;
  }
  return `linear-gradient(180deg, transparent, ${preset.colorSecondary} 30%, ${preset.colorPrimary} 50%, ${preset.colorSecondary} 70%, transparent)`;
}

/** 吸収。対象から発射元へ、光が繰り返し流れ戻る。 */
function appendDrain(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined
): void {
  const life = fadeInOut(progress, 0.2);
  const source = { x: center.x, y: center.y, z: center.z + base * 0.6 };
  const link = projectDirection(origin.x - source.x, origin.y - source.y, origin.z - source.z, view);
  const radians = (link.angle * Math.PI) / 180;
  // 膨らみは経路と直交させる。ワールドの y でずらすと、向きによっては
  // 経路に沿って前後するだけになって弧を描かない。
  const acrossX = -Math.sin(radians);
  const acrossY = Math.cos(radians);

  for (let mote = 0; mote < DRAIN_MOTE_COUNT; mote++) {
    // 位相をずらした粒が繰り返し流れることで、吸われ続けている感じになる。
    const along = (progress * 1.8 + mote / DRAIN_MOTE_COUNT) % 1;
    const swing = Math.sin(along * Math.PI) * base * 0.5 * (mote % 2 === 0 ? 1 : -1);
    const size = base * (0.28 - along * 0.12);
    sprites.push({
      ...blank(),
      key: `${prefix}-drain-${mote}`,
      x: source.x + (origin.x - source.x) * along,
      y: source.y + (origin.y - source.y) * along,
      z: source.z + (origin.z - source.z) * along,
      offsetX: acrossX * swing,
      offsetY: acrossY * swing,
      // 流れる向きへ引き伸ばす。丸のままだと点滅しているように見える。
      width: size * 2.2,
      height: size,
      rotate: link.angle,
      opacity: life * (1 - along * 0.4),
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 45%, #ffffff 70%, transparent)`,
      borderRadius: '50%',
      shadow: glow(base * 0.26, preset.colorSecondary),
    });
  }

  const ring = base * (1.4 - Math.sin(progress * Math.PI) * 0.4);
  sprites.push({
    ...blank(),
    key: `${prefix}-drain-ring`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: ring,
    height: ring,
    opacity: life * 0.8,
    svg: ringSvg(colorsOf(preset), 3.5, true),
    animation: 'effectSpinReverse 2.4s linear infinite',
    flat: true,
  });
}

/** 障壁。六角のドームが張られ、脈打って消える。 */
/**
 * 打撃。斬るのではなく潰す。
 * 当たった瞬間に星形が弾け、集中線が外へ抜ける。アニメの殴打の型をそのまま置く。
 */
function appendBash(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const lift = base * 0.6;

  // 当たった瞬間の白飛び。短いほど硬い音に聞こえる。
  const flash = normalize(progress / 0.1);
  if (flash < 1) {
    const size = base * (1.4 + flash * 1.6);
    sprites.push({
      ...blank(),
      key: `${prefix}-bash-flash`,
      x: center.x,
      y: center.y,
      z: center.z + lift,
      width: size,
      height: size,
      opacity: 1 - flash,
      background: 'radial-gradient(circle, #ffffff 0%, #ffffff 45%, transparent 72%)',
      borderRadius: '50%',
    });
  }

  // 星形。一気に開いて止まり、そのまま消える。
  const star = normalize(progress / 0.42);
  if (star > 0 && star < 1) {
    const size = base * (0.9 + easeOutCubic(star) * 2.1);
    sprites.push({
      ...blank(),
      key: `${prefix}-bash-star`,
      x: center.x,
      y: center.y,
      z: center.z + lift,
      width: size,
      height: size * 0.92,
      rotate: -8,
      opacity: 1 - star * star,
      svg: impactStarSvg(colorsOf(preset)),
      shadow: glow(base * 0.5 * (1 - star), preset.colorSecondary),
    });
  }

  // 集中線。星より一拍遅れて外へ抜ける。
  const lines = normalize((progress - 0.04) / 0.4);
  if (lines > 0 && lines < 1) {
    const size = base * (1.4 + easeOutCubic(lines) * 3);
    sprites.push({
      ...blank(),
      key: `${prefix}-bash-lines`,
      x: center.x,
      y: center.y,
      z: center.z + lift,
      width: size,
      height: size,
      opacity: (1 - lines) * 0.9,
      svg: speedLinesSvg(colorsOf(preset)),
    });
  }

  const ring = normalize((progress - 0.08) / 0.8);
  if (ring > 0 && ring < 1) {
    const size = base * (0.8 + easeOutCubic(ring) * 3.2);
    sprites.push({
      ...blank(),
      key: `${prefix}-bash-shock`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: size,
      height: size,
      opacity: (1 - ring) * 0.8,
      svg: ringSvg(colorsOf(preset), 4),
      flat: true,
    });
  }
}

/** 呪印。印が刻まれ、対象を縛って沈む。 */
function appendCurse(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.25);
  const stamp = normalize(progress / 0.35);

  // 上から降りてきて刻まれる印。
  const markSize = base * (2.4 - Math.min(stamp, 1) * 0.9);
  sprites.push({
    ...blank(),
    key: `${prefix}-curse-mark`,
    x: center.x,
    y: center.y,
    z: center.z + base * (1.6 - Math.min(stamp, 1) * 1.55),
    width: markSize,
    height: markSize,
    opacity: life * 0.95,
    svg: magicCircleSvg(colorsOf(preset)),
    animation: 'effectSpinReverse 5s linear infinite',
    flat: true,
  });

  // 縛る輪。上下から寄って対象を挟み込む。
  for (let ring = 0; ring < CURSE_RING_COUNT; ring++) {
    const local = normalize((progress - ring * 0.12) / 0.7);
    if (local <= 0 || local >= 1) continue;
    const size = base * (1.9 - local * 0.8);
    sprites.push({
      ...blank(),
      key: `${prefix}-curse-ring-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + base * (1.5 - local * 1.2) + ring * base * 0.35,
      width: size,
      height: size,
      opacity: (1 - local) * 0.8,
      svg: ringSvg(colorsOf(preset), 4, true),
      flat: true,
    });
  }
}

function appendBarrier(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.18);
  const dome = base * (1.9 + Math.sin(progress * Math.PI) * 0.25);

  sprites.push({
    ...blank(),
    key: `${prefix}-dome`,
    x: center.x,
    y: center.y,
    z: center.z + base * 0.9,
    width: dome,
    height: dome,
    opacity: life * 0.9,
    svg: barrierSvg(colorsOf(preset)),
    animation: 'effectPulseSoft 1.6s ease-in-out infinite',
  });

  const foot = base * 1.9;
  sprites.push({
    ...blank(),
    key: `${prefix}-barrier-ring`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: foot,
    height: foot,
    opacity: life * 0.8,
    svg: ringSvg(colorsOf(preset), 3),
    animation: 'effectSpinSlow 8s linear infinite',
    flat: true,
  });
}

/** 転移。魔法陣が畳まれ、光の柱になって消える。 */
function appendWarp(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.25);
  const shrink = 1 - easeOutCubic(progress) * 0.75;

  sprites.push({
    ...blank(),
    key: `${prefix}-warp-circle`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: base * 2.2 * shrink,
    height: base * 2.2 * shrink,
    opacity: life * 0.9,
    svg: magicCircleSvg(colorsOf(preset)),
    animation: 'effectSpinSlow 3s linear infinite',
    flat: true,
  });

  // 柱は画面平面で伸びるので、持ち上げも面内で行う。
  // ワールドの z で上げると、盤面を傾けたぶんだけ足元の陣とずれる。
  const columnHeight = base * 3.4;
  sprites.push({
    ...blank(),
    key: `${prefix}-warp-column`,
    x: center.x,
    y: center.y,
    z: center.z,
    offsetY: -columnHeight / 2,
    width: base * 1.2 * shrink,
    height: columnHeight,
    opacity: life * 0.75,
    background: `linear-gradient(180deg, transparent, ${preset.colorPrimary} 45%, #ffffff 80%, ${preset.colorSecondary})`,
    borderRadius: '50%',
    shadow: glow(base * 0.6, preset.colorPrimary),
  });
}

/** 重力。輪が内へ縮み、中心へ引き込む。 */
function appendGravity(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.16);

  sprites.push({
    ...blank(),
    key: `${prefix}-gravity-field`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: base * 2.6,
    height: base * 2.6,
    opacity: life * 0.75,
    svg: gravitySvg(colorsOf(preset)),
    animation: 'effectSpinSlow 4s linear infinite',
    flat: true,
  });

  // 輪は外から内へ縮む。広がる衝撃波と逆にすることで、引き込まれる向きが読める。
  for (let ring = 0; ring < 3; ring++) {
    const local = normalize((progress - ring * 0.18) / 0.62);
    if (local <= 0 || local >= 1) continue;
    const size = base * (3.2 - easeOutCubic(local) * 2.9);
    sprites.push({
      ...blank(),
      key: `${prefix}-gravity-ring-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + base * 0.5,
      width: size,
      height: size,
      opacity: (1 - local) * 0.85,
      svg: ringSvg(colorsOf(preset), 3),
    });
  }

  const core = base * (0.4 + Math.sin(progress * Math.PI) * 0.7);
  sprites.push({
    ...blank(),
    key: `${prefix}-gravity-core`,
    x: center.x,
    y: center.y,
    z: center.z + base * 0.5,
    width: core,
    height: core,
    opacity: life,
    background: `radial-gradient(circle, #000000 0%, ${preset.colorSecondary} 65%, transparent 85%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.7, preset.colorSecondary),
  });
}

function appendSlash(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const style = preset.slashLook;
  const hits = slashHits(style);
  const charged = style === 'wide' || style === 'heavy';

  if (charged) appendSlashCharge(sprites, prefix, center, base, progress, preset);
  if (style === 'iai') appendIaiStance(sprites, prefix, center, base, progress, preset);

  // 太刀ごとに角度と間合いをずらす。同じ場所に重ねると 1 回斬ったようにしか見えない。
  hits.forEach((hit, index) => {
    const sweepMs = Math.max(Math.round(preset.duration * hit.span), 70);
    sprites.push({
      ...blank(),
      key: `${prefix}-blade-${index}`,
      x: center.x,
      y: center.y,
      z: center.z + base * 0.55,
      offsetX: hit.offsetX * base,
      offsetY: hit.offsetY * base,
      width: base * hit.reach,
      height: base * (hit.thickness / 30),
      rotate: hit.angle,
      svg: crescentSvg(colorsOf(preset), hit.thickness),
      animation: `effectSlashSweep ${sweepMs}ms cubic-bezier(0.2, 0.85, 0.3, 1) ${Math.round(hit.at * preset.duration)}ms both`,
      origin: '0% 50%',
    });

    const local = normalize((progress - hit.at) / hit.span);
    if (local > 0 && local < 0.5) {
      appendFlareSpikes(sprites, `${prefix}-${index}`, center, base, local / 0.5, preset, 2.6, base * 0.55);
    }
  });

  if (charged || style === 'iai') {
    appendSlashAftermath(sprites, prefix, center, base, progress, preset, hits[0], style);
  }
}

/** 居合の溜め。動かず、鞘元だけが光る。 */
function appendIaiStance(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const hold = normalize(progress / SLASH_IAI_AT);
  if (hold <= 0 || hold >= 1) return;

  // 張り詰めた静止。細い光が一本だけ伸びる。
  const glint = base * (0.5 + hold * 1.1);
  sprites.push({
    ...blank(),
    key: `${prefix}-iai-glint`,
    x: center.x,
    y: center.y,
    z: center.z + base * 0.55,
    width: glint,
    height: base * 0.045,
    rotate: -6,
    opacity: hold * hold * 0.9,
    background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 60%, #ffffff)`,
    borderRadius: '50%',
    shadow: glow(base * 0.2 * hold, preset.colorPrimary),
  });
}

/** 溜め。刃に光が集まり、間合いが張り詰める。 */
function appendSlashCharge(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const charge = normalize(progress / SLASH_CHARGE_END);
  if (charge <= 0 || charge >= 1) return;

  const gather = base * (1.6 - charge * 1.2);
  sprites.push({
    ...blank(),
    key: `${prefix}-charge`,
    x: center.x,
    y: center.y,
    z: center.z + base * 0.7,
    width: gather,
    height: gather,
    opacity: charge * 0.85,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 40%, transparent 72%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.5 * charge, preset.colorPrimary, base * 1.2 * charge, preset.colorSecondary),
  });

  // 周囲から刃へ吸い寄せられる光。溜めていることが読める。
  for (let index = 0; index < SLASH_CHARGE_COUNT; index++) {
    const angle = (Math.PI * 2 * index) / SLASH_CHARGE_COUNT;
    const distance = base * (2.4 - charge * 2);
    sprites.push({
      ...blank(),
      key: `${prefix}-charge-${index}`,
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
      z: center.z + base * 0.7,
      width: base * 0.7,
      height: base * 0.1,
      rotate: (angle * 180) / Math.PI,
      opacity: charge * 0.8,
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary})`,
      borderRadius: '50%',
    });
  }
}

/** 余韻。斬り口が残り、地面へ衝撃が抜ける。 */
function appendSlashAftermath(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  hit: SlashHit,
  style: SlashStyle
): void {
  const after = normalize((progress - hit.at - hit.span * 0.35) / (1 - hit.at - hit.span * 0.35));
  if (after <= 0 || after >= 1) return;

  // 斬り口。振り抜いた線がしばらく残る。
  sprites.push({
    ...blank(),
    key: `${prefix}-cut`,
    x: center.x,
    y: center.y,
    z: center.z + base * 0.55,
    width: base * hit.reach * 1.15,
    height: base * 0.1 * (1 - after * 0.6),
    rotate: hit.angle,
    opacity: (1 - after) * 0.95,
    background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 25%, #ffffff 50%, ${preset.colorPrimary} 75%, transparent)`,
    borderRadius: '50%',
    shadow: glow(base * 0.4 * (1 - after), '#ffffff'),
  });

  // 居合は斬り口だけ残す。地面を割るのは力任せの型の役目。
  if (style === 'iai') return;

  const shock = base * (0.8 + easeOutCubic(after) * 3.4);
  sprites.push({
    ...blank(),
    key: `${prefix}-slash-shock`,
    x: center.x,
    y: center.y,
    z: center.z + 2,
    width: shock,
    height: shock,
    opacity: (1 - after) * 0.85,
    svg: ringSvg(colorsOf(preset), 3),
    flat: true,
  });

  const crack = base * (1.2 + easeOutCubic(after) * 2.4);
  if (style === 'heavy') {
    // 唐竹割りは真下へ抜けるので、地面も一本の裂け目になる。
    sprites.push({
      ...blank(),
      key: `${prefix}-slash-split`,
      x: center.x,
      y: center.y,
      z: center.z + 1,
      width: crack * 1.6,
      height: base * 0.28 * (1 - after * 0.5),
      rotate: 8,
      opacity: (1 - after) * 0.85,
      background: `linear-gradient(90deg, transparent, ${preset.colorSecondary} 20%, #000000 50%, ${preset.colorSecondary} 80%, transparent)`,
      borderRadius: '50%',
      flat: true,
    });
    return;
  }

  sprites.push({
    ...blank(),
    key: `${prefix}-slash-crack`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: crack,
    height: crack,
    opacity: (1 - after) * 0.7,
    svg: crackSvg(colorsOf(preset), 6, SLASH_CRACK_JITTER),
    flat: true,
  });
}

function appendBurst(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  for (let ring = 0; ring < 2; ring++) {
    const local = normalize((progress - ring * 0.16) / 0.8);
    if (local <= 0 || local >= 1) continue;
    const ringSize = base * (1.1 + easeOutCubic(local) * 3.6);
    sprites.push({
      ...blank(),
      key: `${prefix}-ring-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: ringSize,
      height: ringSize,
      opacity: (1 - local) * 0.85,
      svg: ringSvg(colorsOf(preset), 3.5),
      flat: true,
    });
  }

  if (progress < 0.3) appendFlareSpikes(sprites, prefix, center, base, progress / 0.3, preset, 4.4, base * 0.6);

  const scorch = base * (1.4 + easeOutCubic(progress) * 2);
  sprites.push({
    ...blank(),
    key: `${prefix}-scorch`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: scorch,
    height: scorch,
    opacity: (1 - progress) * 0.5,
    background: `radial-gradient(circle, ${preset.colorSecondary} 0%, transparent 70%)`,
    borderRadius: '50%',
    flat: true,
  });
}

function appendFlame(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.22);
  const bed = base * 1.3;
  sprites.push({
    ...blank(),
    key: `${prefix}-bed`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: bed,
    height: bed,
    opacity: life * 0.6,
    background: `radial-gradient(circle, #fff2c4 0%, ${preset.colorPrimary} 30%, ${preset.colorSecondary} 55%, transparent 76%)`,
    borderRadius: '50%',
    animation: 'effectPulseSoft 0.9s ease-in-out infinite',
    flat: true,
  });
}

function appendHeal(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.18);
  const circleSize = base * 2.2;

  sprites.push({
    ...blank(),
    key: `${prefix}-circle`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: circleSize,
    height: circleSize,
    opacity: life * 0.9,
    svg: magicCircleSvg(colorsOf(preset)),
    animation: 'effectSpinSlow 9s linear infinite',
    flat: true,
  });

  sprites.push({
    ...blank(),
    key: `${prefix}-circle-inner`,
    x: center.x,
    y: center.y,
    z: center.z + 2,
    width: circleSize * 0.62,
    height: circleSize * 0.62,
    opacity: life * 0.75,
    svg: ringSvg(colorsOf(preset), 4, true),
    animation: 'effectSpinReverse 6s linear infinite',
    flat: true,
  });

  for (let ring = 0; ring < HEAL_RING_COUNT; ring++) {
    const local = normalize((progress - ring * 0.2) / 0.7);
    if (local <= 0 || local >= 1) continue;
    const size = base * (1.3 + local * 0.7);
    sprites.push({
      ...blank(),
      key: `${prefix}-ring-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + base * local * 2.2,
      width: size,
      height: size,
      opacity: fadeInOut(local, 0.22) * 0.9,
      svg: ringSvg(colorsOf(preset), 3),
      flat: true,
    });
  }
}

function appendImpact(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  const crackJitter = takeRandoms(random, 8);

  for (let ring = 0; ring < 3; ring++) {
    const local = normalize((progress - ring * 0.17) / 0.8);
    if (local <= 0 || local >= 1) continue;
    const size = base * (0.8 + easeOutCubic(local) * 4.6);
    sprites.push({
      ...blank(),
      key: `${prefix}-shock-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: size,
      height: size,
      opacity: (1 - local) * 0.9,
      svg: ringSvg(colorsOf(preset), 3.5),
      flat: true,
    });
  }

  const crackSize = base * (1.4 + easeOutCubic(progress) * 3.2);
  sprites.push({
    ...blank(),
    key: `${prefix}-cracks`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: crackSize,
    height: crackSize,
    opacity: (1 - progress) * 0.8,
    svg: crackSvg(colorsOf(preset), 8, crackJitter),
    flat: true,
  });
}

/** 岩石破砕。割れ目が走り、そこから岩が砕けて飛ぶ。飛ぶ岩は canvas 側。 */
function appendRubble(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  const crackJitter = takeRandoms(random, 10);

  const crackSize = base * (1.2 + easeOutCubic(progress) * 2.6);
  sprites.push({
    ...blank(),
    key: `${prefix}-cracks`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: crackSize,
    height: crackSize,
    opacity: (1 - progress * 0.7) * 0.9,
    svg: crackSvg(colorsOf(preset), 10, crackJitter),
    flat: true,
  });

  const local = normalize(progress / 0.7);
  if (local > 0 && local < 1) {
    const ringSize = base * (0.9 + easeOutCubic(local) * 2.8);
    sprites.push({
      ...blank(),
      key: `${prefix}-shock-0`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: ringSize,
      height: ringSize,
      opacity: (1 - local) * 0.75,
      svg: ringSvg(colorsOf(preset), 3.5),
      flat: true,
    });
  }
}

/** 地面隆起。割れ目から岩盤がせり上がって対象を突き上げる。 */
function appendUpheaval(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  const slabAngles = takeRandoms(random, UPHEAVAL_SLAB_COUNT);
  const slabSizes = takeRandoms(random, UPHEAVAL_SLAB_COUNT);
  const crackJitter = takeRandoms(random, 8);

  const crackSize = base * (1.2 + easeOutCubic(progress) * 2.2);
  sprites.push({
    ...blank(),
    key: `${prefix}-cracks`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: crackSize,
    height: crackSize,
    opacity: Math.min(1, progress * 4) * (1 - progress * 0.6) * 0.9,
    svg: crackSvg(colorsOf(preset), 8, crackJitter),
    flat: true,
  });

  // せり上がって、頂点で止まり、崩れて沈む。
  for (let slab = 0; slab < UPHEAVAL_SLAB_COUNT; slab++) {
    const local = normalize((progress - slab * 0.05) / 0.85);
    if (local <= 0 || local >= 1) continue;
    const thrust = local < 0.45 ? easeOutCubic(local / 0.45) : 1 - (local - 0.45) / 0.55;
    const height = base * (1.1 + slabSizes[slab] * 1.5) * thrust;
    if (height <= 0) continue;
    const angle = (Math.PI * 2 * slab) / UPHEAVAL_SLAB_COUNT + slabAngles[slab] * 0.4;
    sprites.push({
      ...blank(),
      key: `${prefix}-slab-${slab}`,
      x: center.x + Math.cos(angle) * base * (0.5 + slabAngles[slab] * 0.5),
      y: center.y + Math.sin(angle) * base * (0.5 + slabAngles[slab] * 0.5),
      z: center.z + height * 0.5,
      width: base * (0.7 + slabSizes[slab] * 0.5),
      height,
      rotate: (slabAngles[slab] - 0.5) * 26,
      opacity: 0.95,
      svg: spikeSvg({ core: '#8a7259', edge: '#4a3a2c' }),
    });
  }
}

/** きのこ雲。地面の衝撃輪だけ受け持ち、柱と笠は canvas 側で描く。 */
function appendMushroom(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  for (let ring = 0; ring < 3; ring++) {
    const local = normalize((progress - ring * 0.12) / 0.6);
    if (local <= 0 || local >= 1) continue;
    const size = base * (1.4 + easeOutCubic(local) * 8);
    sprites.push({
      ...blank(),
      key: `${prefix}-shock-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: size,
      height: size,
      opacity: (1 - local) * 0.85,
      svg: ringSvg(colorsOf(preset), 2.4),
      flat: true,
    });
  }

  const flash = normalize(progress / 0.16);
  if (flash < 1) appendFlareSpikes(sprites, prefix, center, base, flash, preset, 9, base * 0.8);
}

function appendBolt(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  const channelJitter = takeRandoms(random, BOLT_SEGMENT_COUNT + 1);
  const branchSeeds = takeRandoms(random, BOLT_BRANCH_COUNT * 2);

  const skyHeight = base * 5.4;
  const spread = base * 0.62;
  const boxWidth = spread * 2 + base * 0.9;
  const lift = base * 0.35;

  if (progress < BOLT_STRIKE_END) {
    // 稲妻は 1 枚の SVG。折れ線として繋がるので「光が降ってくる」ではなく「走る」見え方になる。
    sprites.push({
      ...blank(),
      key: `${prefix}-channel`,
      x: center.x,
      y: center.y,
      z: center.z + lift,
      offsetY: -skyHeight / 2,
      width: boxWidth,
      height: skyHeight,
      svg: boltSvg(boxWidth, skyHeight, spread, base * 0.1, channelJitter, branchSeeds, colorsOf(preset)),
      animation: `effectBoltStrike ${Math.round(preset.duration * BOLT_STRIKE_END)}ms linear forwards`,
    });
  }

  const flash = normalize(progress / 0.36);
  if (flash > 0 && flash < 1) appendFlareSpikes(sprites, prefix, center, base, flash, preset, 5, base * 0.5);

  const scorch = base * (1.6 + easeOutCubic(progress) * 2.2);
  sprites.push({
    ...blank(),
    key: `${prefix}-scorch`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: scorch,
    height: scorch,
    opacity: (1 - progress) * 0.55,
    background: `radial-gradient(circle, #ffffff 0%, ${preset.colorSecondary} 40%, transparent 72%)`,
    borderRadius: '50%',
    flat: true,
  });
}

function appendFrost(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number
): void {
  const shardAngles = takeRandoms(random, FROST_SHARD_COUNT);
  const shardHeights = takeRandoms(random, FROST_SHARD_COUNT);
  const shardSpins = takeRandoms(random, FROST_SHARD_COUNT);
  const spikeSizes = takeRandoms(random, FROST_SPIKE_COUNT);

  const gather = normalize(progress / 0.55);
  if (gather < 1) {
    for (let shard = 0; shard < FROST_SHARD_COUNT; shard++) {
      const angle = shardAngles[shard] * Math.PI * 2;
      const distance = base * 2.4 * (1 - easeOutCubic(gather));
      const size = base * (0.34 + shardSpins[shard] * 0.16);
      sprites.push({
        ...blank(),
        key: `${prefix}-shard-${shard}`,
        x: center.x + Math.cos(angle) * distance,
        y: center.y + Math.sin(angle) * distance,
        z: center.z + base * (0.3 + shardHeights[shard] * 1.2),
        width: size,
        height: size,
        opacity: fadeInOut(gather, 0.15),
        svg: snowflakeSvg(colorsOf(preset)),
        animation: `effectSpinSlow ${(4 + shardSpins[shard] * 4).toFixed(1)}s linear infinite`,
      });
    }
  }

  const burst = normalize((progress - 0.42) / 0.58);
  if (burst > 0 && burst < 1) {
    for (let spike = 0; spike < FROST_SPIKE_COUNT; spike++) {
      const angle = (Math.PI * 2 * spike) / FROST_SPIKE_COUNT;
      const height = base * (1 + spikeSizes[spike] * 1.4) * easeOutCubic(burst);
      sprites.push({
        ...blank(),
        key: `${prefix}-spike-${spike}`,
        x: center.x + Math.cos(angle) * base * 0.85,
        y: center.y + Math.sin(angle) * base * 0.85,
        z: center.z + height * 0.5,
        width: base * 0.38,
        height,
        rotate: (spikeSizes[spike] - 0.5) * 22,
        opacity: (1 - burst) * 0.95,
        svg: spikeSvg(colorsOf(preset)),
      });
    }
  }

  const ringSize = base * (1.2 + easeOutCubic(progress) * 2.4);
  sprites.push({
    ...blank(),
    key: `${prefix}-frost-ring`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: ringSize,
    height: ringSize,
    opacity: (1 - progress) * 0.85,
    svg: ringSvg(colorsOf(preset), 4, true),
    animation: 'effectSpinSlow 12s linear infinite',
    flat: true,
  });
}

function appendNova(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  for (let ring = 0; ring < 2; ring++) {
    const local = normalize((progress - ring * 0.16) / 0.84);
    if (local <= 0 || local >= 1) continue;
    const shockSize = base * (1.6 + easeOutCubic(local) * 7);
    sprites.push({
      ...blank(),
      key: `${prefix}-nova-shock-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: shockSize,
      height: shockSize,
      opacity: (1 - local) * 0.9,
      svg: ringSvg(colorsOf(preset), 2.6),
      flat: true,
    });
  }

  const flash = normalize(progress / 0.24);
  if (flash < 1) {
    appendFlareSpikes(sprites, prefix, center, base, flash, preset, 7, base * 0.8);
    sprites.push({
      ...blank(),
      key: `${prefix}-nova-streak`,
      x: center.x,
      y: center.y,
      z: center.z + base * 0.8,
      width: base * (5 + easeOutCubic(flash) * 5),
      height: base * 0.26 * (1 - flash),
      opacity: (1 - flash) * 0.9,
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 25%, #ffffff 50%, ${preset.colorPrimary} 75%, transparent)`,
      borderRadius: '50%',
    });
  }
}

function appendVortex(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.18);
  const swirlSize = base * 3;

  sprites.push({
    ...blank(),
    key: `${prefix}-swirl`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: swirlSize,
    height: swirlSize,
    opacity: life * 0.6,
    svg: spiralSvg(colorsOf(preset), 3),
    animation: 'effectSwirl 1.8s linear infinite',
    flat: true,
  });

  for (let ring = 0; ring < 2; ring++) {
    const ringSize = base * (1.4 + ring * 1);
    sprites.push({
      ...blank(),
      key: `${prefix}-vortex-ring-${ring}`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: ringSize,
      height: ringSize,
      opacity: life * (0.5 - ring * 0.18),
      svg: ringSvg(colorsOf(preset), 3, true),
      animation: `effectSpinSlow ${(3 + ring * 2).toFixed(1)}s linear infinite`,
      flat: true,
    });
  }
}

function appendMiasma(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.22);
  const poolSize = base * 2.2;

  sprites.push({
    ...blank(),
    key: `${prefix}-pool`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: poolSize,
    height: poolSize,
    opacity: life * 0.5,
    background: `radial-gradient(circle, ${preset.colorSecondary} 0%, ${preset.colorPrimary} 40%, transparent 74%)`,
    borderRadius: '50%',
    animation: 'effectPulseSoft 3.2s ease-in-out infinite',
    flat: true,
  });
}

function appendAura(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset
): void {
  const life = fadeInOut(progress, 0.28);
  const spin = progress * Math.PI * 3;
  const circleSize = base * 2.4;

  sprites.push({
    ...blank(),
    key: `${prefix}-circle`,
    x: center.x,
    y: center.y,
    z: center.z + 1,
    width: circleSize,
    height: circleSize,
    opacity: life * 0.9,
    svg: magicCircleSvg(colorsOf(preset)),
    animation: 'effectSpinReverse 7s linear infinite',
    flat: true,
  });

  for (let pulse = 0; pulse < AURA_PULSE_COUNT; pulse++) {
    const local = normalize((progress - pulse * 0.3) / 0.5);
    if (local <= 0 || local >= 1) continue;
    const size = base * (0.9 + easeOutCubic(local) * 2);
    sprites.push({
      ...blank(),
      key: `${prefix}-pulse-${pulse}`,
      x: center.x,
      y: center.y,
      z: center.z + 2,
      width: size,
      height: size,
      opacity: (1 - local) * 0.85,
      svg: ringSvg(colorsOf(preset), 3),
      flat: true,
    });
  }

  for (let spike = 0; spike < AURA_SPIKE_COUNT; spike++) {
    const angle = spin + (Math.PI * 2 * spike) / AURA_SPIKE_COUNT;
    const radius = base * 0.85;
    sprites.push({
      ...blank(),
      key: `${prefix}-aura-spike-${spike}`,
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
      z: center.z + base * (0.5 + Math.sin(spin + spike) * 0.25),
      width: base * 0.28,
      height: base * 0.9,
      rotate: Math.sin(angle) * 26,
      opacity: life * 0.9,
      svg: spikeSvg(colorsOf(preset)),
    });
  }
}

function blank(): EffectSprite {
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
function takeRandoms(random: () => number, count: number): number[] {
  const values: number[] = [];
  for (let index = 0; index < count; index++) values.push(random());
  return values;
}

function normalize(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

function easeOutCubic(value: number): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  return 1 - Math.pow(1 - clamped, 3);
}

/** 立ち上がり `rise` の割合で 0→1、残りで 1→0 に落ちる。 */
function fadeInOut(value: number, rise: number): number {
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
