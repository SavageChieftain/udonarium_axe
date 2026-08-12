import { effectMoteOf } from '@axe/domain/effect/effect-motes';
import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import { boltSvg, breathConeSvg, ringSvg, snowflakeSvg } from '@axe/domain/effect/effect-shapes';
import { projectDirection, type ViewRotation } from '@axe/domain/effect/effect-view';
import {
  blank,
  clamp01,
  colorsOf,
  easeOutCubic,
  type EffectSprite,
  fadeInOut,
  glow,
  normalize,
  type Point3,
  pointBetween,
} from '@axe/domain/effect/timeline/shared';

/**
 * 吐くもの・吸うもの。
 *
 * 口から前へ広がるブレスと、的からこちらへ吸い上げるドレイン。
 */

/** 口元から対象まで届くまで。 */
const BREATH_REACH_END = 0.12;
/** 息が切れはじめる位置。 */
const BREATH_RELEASE_AT = 0.74;
const BREATH_LOBE_COUNT = 8;
const BREATH_STREAK_COUNT = 6;
const BREATH_MOTE_COUNT = 9;
const BREATH_ARC_JITTER = [0.5, 0.14, 0.82, 0.28, 0.66, 0.5];
/** 粒の流れる速さ。火花は弾け、氷と靄は漂い、木の葉は巻かれる。 */
const BREATH_MOTE_SPEED: Record<string, number> = {
  spark: 1.5,
  frost: 0.55,
  arc: 1.2,
  leaf: 0.85,
  haze: 0.5,
  none: 0,
};
/** 流れが 1 巡する実時間(ms)。尺が変わっても見た目の速さを揃える。 */
const BREATH_FLOW_MS = 300;
const BREATH_TIP_COUNT = 4;
const BREATH_SOOT_COUNT = 5;
const BREATH_SPLASH_ANGLES = [-64, -34, 0, 34, 64];
/**
 * 円錐の層。外は薄く広く、芯は細く濃い。
 * `ripple` を変えて層ごとに違う輪郭にすると、重ねたときに縁が単調にならない。
 */
const BREATH_LAYERS = [
  { key: 'haze', width: 1.55, opacity: 0.36, ripple: 0 },
  { key: 'body', width: 1, opacity: 0.82, ripple: 1 },
  { key: 'core', width: 0.4, opacity: 1, ripple: 2 },
];
const DRAIN_MOTE_COUNT = 10;
/**
 * ブレス。口元から対象へ、広がりながら吹き付ける。
 *
 * 丸を等間隔に並べると数珠になって「吹き付け」に見えないので、
 * 経路上の区間で 1 本の円錐を組み、縁に渦を転がして乱れを出す。
 * 区間ごとに自分の奥行きを持つので、間に立つコマと正しく前後する。
 */
export function appendBreath(
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
  const release = clamp01(normalize((progress - BREATH_RELEASE_AT) / (1 - BREATH_RELEASE_AT)));
  // 吹き終わりは薄れながら散る。1 枚の円錐なので、口元から削るより自然に消える。
  const life = 1 - release ** 1.4;
  const dissipate = 1 + release * 0.4;
  /**
   * 流れの速さ。再生位置ではなく実尺から出す。
   * 割合で回すと、尺の長いブレスほど中身がゆっくり動いて勢いが死ぬ。
   */
  const flow = preset.duration / BREATH_FLOW_MS;
  // 吐き出す量そのものを脈打たせる。一定量だと吹き付けている感じが出ない。
  const swell = 1 + Math.sin(progress * flow * 4.4) * 0.13;

  // 円錐は 1 枚で描く。区間に割ると、区間ごとの太さと濃さの差が縦縞になって出る。
  const anchor = pointBetween(mouth, impact, front / 2);
  const coneLength = link.length * front;
  const coneSpread = breathSpread(front, progress) * base * swell * dissipate;

  for (const layer of BREATH_LAYERS) {
    sprites.push({
      ...blank(),
      key: `${prefix}-breath-cone-${layer.key}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      width: coneLength,
      height: coneSpread * layer.width,
      rotate: link.angle,
      opacity: life * layer.opacity,
      svg: breathConeSvg(colorsOf(preset), layer.ripple),
    });
  }

  // 縁を転がる渦。まっすぐな円錐に乱れが出て、気体らしく見える。
  // 左右と大きさを規則的にすると回転する飾りに見えるので、粒ごとに崩す。
  for (let lobe = 0; lobe < BREATH_LOBE_COUNT; lobe++) {
    const at = (progress * flow * 0.9 + lobe / BREATH_LOBE_COUNT) % 1;
    if (at > front) continue;

    const spread = breathSpread(at, progress) * base * swell;
    const side = Math.sin(lobe * 2.4) >= 0 ? 1 : -1;
    const shift = side * spread * (0.3 + Math.sin(progress * 9 + lobe * 1.7) * 0.16);
    const anchor = pointBetween(mouth, impact, at);
    const size = spread * (0.42 + at * 0.3) * (1 + Math.sin(lobe * 3.1) * 0.22);
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

  // 軸を走り抜ける筋。流れている物が見えないと、色の付いた霧が漂っているだけになる。
  for (let streak = 0; streak < BREATH_STREAK_COUNT; streak++) {
    const at = (progress * flow * 1.9 + streak / BREATH_STREAK_COUNT) % 1;
    if (at > front) continue;

    const spread = breathSpread(at, progress) * base * swell;
    const shift = Math.sin(streak * 5.1 + progress * flow) * spread * 0.3;
    const anchor = pointBetween(mouth, impact, at);
    sprites.push({
      ...blank(),
      key: `${prefix}-breath-streak-${streak}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      offsetX: acrossX * shift,
      offsetY: acrossY * shift,
      width: link.length * 0.3,
      height: spread * 0.16,
      rotate: link.angle,
      opacity: life * (0.85 - at * 0.45),
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 55%, #ffffff 82%, transparent)`,
      borderRadius: '50%',
    });
  }

  // 先端はほどけて大きく散る。ここが細いままだと、ただの円錐に見える。
  for (let puff = 0; puff < BREATH_TIP_COUNT; puff++) {
    const at = 0.72 + ((progress * flow * 0.7 + puff / BREATH_TIP_COUNT) % 1) * 0.28;
    if (at > front) continue;

    const spread = breathSpread(at, progress) * base * swell;
    const shift = Math.sin(puff * 2.7 + progress * 5) * spread * 0.5;
    const anchor = pointBetween(mouth, impact, at);
    const size = spread * (0.7 + Math.sin(puff * 1.9) * 0.2);
    sprites.push({
      ...blank(),
      key: `${prefix}-breath-tip-${puff}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      offsetX: acrossX * shift,
      offsetY: acrossY * shift,
      width: size,
      height: size,
      opacity: life * 0.34,
      background: `radial-gradient(circle, ${preset.colorSecondary} 0%, ${preset.colorSecondary} 30%, transparent 74%)`,
      borderRadius: '50%',
    });
  }

  appendBreathMotes(sprites, prefix, mouth, impact, base, progress, preset, link, acrossX, acrossY, front, flow, life);

  // 流れの中に混ざる煙。光だけだと気体の密度が出ない。
  for (let soot = 0; soot < BREATH_SOOT_COUNT; soot++) {
    const at = (progress * flow * 0.45 + soot / BREATH_SOOT_COUNT) % 1;
    if (at > front) continue;

    const spread = breathSpread(at, progress) * base * swell;
    const shift = Math.sin(soot * 4.3 + progress * 3.4) * spread * 0.42;
    const anchor = pointBetween(mouth, impact, at);
    const size = spread * (0.4 + at * 0.5);
    sprites.push({
      ...blank(),
      key: `${prefix}-breath-soot-${soot}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      offsetX: acrossX * shift,
      offsetY: acrossY * shift,
      width: size,
      height: size,
      opacity: life * at * 0.18,
      background: 'radial-gradient(circle, #2f2823 0%, transparent 70%)',
      borderRadius: '50%',
    });
  }

  {
    const flare = base * (1.15 + Math.sin(progress * flow * 5) * 0.22) * life;
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

/**
 * 道中に散る粒。属性ごとに違う物を舞わせる。
 *
 * 円錐の形と色だけだと、どの属性でも同じ物が色違いで飛んでいるように見える。
 * 火花は外へ弾け、氷は漂って瞬き、放電は途中で走り、木の葉は舞い、靄は流れに滲む。
 */
function appendBreathMotes(
  sprites: EffectSprite[],
  prefix: string,
  mouth: Point3,
  impact: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  link: { angle: number; length: number },
  acrossX: number,
  acrossY: number,
  front: number,
  flow: number,
  life: number
): void {
  const mote = effectMoteOf(preset);
  if (mote === 'none') return;

  const colors = colorsOf(preset);
  for (let index = 0; index < BREATH_MOTE_COUNT; index++) {
    const at = (progress * flow * BREATH_MOTE_SPEED[mote] + index / BREATH_MOTE_COUNT) % 1;
    if (at > front) continue;

    const spread = breathSpread(at, progress) * base;
    const anchor = pointBetween(mouth, impact, at);
    // 流れから外れるほど遠くへ飛ぶ。まっすぐ並んで流れると帯に見える。
    const scatter = Math.sin(index * 4.7) * spread * (0.25 + at * 0.45);
    const sprite: EffectSprite = {
      ...blank(),
      key: `${prefix}-breath-mote-${index}`,
      x: anchor.x,
      y: anchor.y,
      z: anchor.z,
      offsetX: acrossX * scatter,
      offsetY: acrossY * scatter,
      width: base * 0.3,
      height: base * 0.3,
      opacity: life * (1 - at * 0.5),
    };

    switch (mote) {
      case 'spark':
        // 弾ける火の粉。進む向きへ引き伸ばし、先へ行くほど小さく散る。
        sprites.push({
          ...sprite,
          width: base * (0.34 - at * 0.14),
          height: base * (0.1 - at * 0.03),
          rotate: link.angle + Math.sin(index * 2.9 + progress * flow) * 42,
          opacity: life * (0.95 - at * 0.6),
          background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 40%, #ffffff 85%)`,
          borderRadius: '50%',
          shadow: glow(base * 0.14, preset.colorPrimary),
        });
        break;
      case 'frost':
        // 舞う氷晶。ゆっくり回りながら瞬く。
        sprites.push({
          ...sprite,
          width: base * (0.22 + at * 0.12),
          height: base * (0.22 + at * 0.12),
          opacity: life * (0.75 - at * 0.35) * (0.55 + Math.sin(index * 3.3 + progress * flow * 2.4) * 0.45),
          svg: snowflakeSvg(colors),
          animation: `effectSpinSlow ${(2.2 + (index % 3) * 0.7).toFixed(1)}s linear infinite`,
        });
        break;
      case 'arc':
        // 途中で走る放電。出っぱなしにせず、点いたり消えたりさせる。
        if (Math.sin(index * 5.3 + progress * flow * 5) < 0.1) break;
        sprites.push({
          ...sprite,
          width: base * 0.8,
          height: base * (0.4 + at * 0.3),
          rotate: link.angle + Math.sin(index * 1.9) * 30,
          opacity: life * 0.9,
          svg: boltSvg(100, 100, 34, 7, BREATH_ARC_JITTER, [], colors),
        });
        break;
      case 'leaf':
        // 舞う木の葉。ひらひら回して、風に巻かれている感じを出す。
        sprites.push({
          ...sprite,
          width: base * (0.2 + at * 0.08),
          height: base * (0.13 + at * 0.05),
          rotate: index * 61 + progress * flow * 260,
          opacity: life * (0.85 - at * 0.35),
          background: `linear-gradient(120deg, ${preset.colorSecondary}, ${preset.colorPrimary})`,
          borderRadius: '60% 0 60% 0',
        });
        break;
      default:
        // 流れに滲む黒い靄。輪郭を持たせず、密度だけを足す。
        sprites.push({
          ...sprite,
          width: spread * (0.35 + at * 0.3),
          height: spread * (0.35 + at * 0.3),
          opacity: life * (0.4 - at * 0.12),
          background: `radial-gradient(circle, #120c18 0%, ${preset.colorSecondary}55 45%, transparent 74%)`,
          borderRadius: '50%',
        });
        break;
    }
  }
}

/**
 * 口元から先端へ向かう広がり。根元は細く、先ほど大きく散る。
 *
 * きれいな三角形にすると噴射口から出る一様な流れに見えるので、
 * 位相の違う波を重ねて縁をうねらせ、そのうねりを先へ流す。
 */
function breathSpread(at: number, progress: number): number {
  const roll = Math.sin(at * 7.3 - progress * 11) * 0.1 + Math.sin(at * 13.1 + progress * 6.2) * 0.05;
  return (0.4 + at ** 0.8 * 2.1) * (1 + roll);
}

/** 吸収。対象から発射元へ、光が繰り返し流れ戻る。 */
export function appendDrain(
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
