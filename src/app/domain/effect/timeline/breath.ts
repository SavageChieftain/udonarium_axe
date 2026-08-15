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
 * What is breathed out and what is drawn in.
 *
 * A breath spreading forward from the mouth, and a drain pulling back from the target.
 */

/** How long it takes to reach the target from the mouth. */
const BREATH_REACH_END = 0.12;
/** Where the breath begins to fail. */
const BREATH_RELEASE_AT = 0.74;
const BREATH_LOBE_COUNT = 8;
const BREATH_STREAK_COUNT = 6;
const BREATH_MOTE_COUNT = 9;
const BREATH_ARC_JITTER = [0.5, 0.14, 0.82, 0.28, 0.66, 0.5];
/** How fast the particles flow: sparks burst, ice and haze drift, and leaves are swept along. */
const BREATH_MOTE_SPEED: Record<string, number> = {
  spark: 1.5,
  frost: 0.55,
  arc: 1.2,
  leaf: 0.85,
  haze: 0.5,
  none: 0,
};
/** How long the flow takes to come round, so it looks the same speed however long the effect runs. */
const BREATH_FLOW_MS = 300;
const BREATH_TIP_COUNT = 4;
const BREATH_SOOT_COUNT = 5;
const BREATH_SPLASH_ANGLES = [-64, -34, 0, 34, 64];
/**
 * The layers of the cone: thin and wide outside, narrow and thick at the core.
 * Giving each layer its own outline keeps the edge from being even where they overlap.
 */
const BREATH_LAYERS = [
  { key: 'haze', width: 1.55, opacity: 0.36, ripple: 0 },
  { key: 'body', width: 1, opacity: 0.82, ripple: 1 },
  { key: 'core', width: 0.4, opacity: 1, ripple: 2 },
];
const DRAIN_MOTE_COUNT = 10;
/**
 * A breath, blown from the mouth to the target and widening as it goes.
 *
 * Circles at even spacing string together like beads and never read as a breath, so the
 * path is built as one cone in sections, with swirls rolling along its edge for turbulence.
 * Each section carries its own depth, so the pieces between sit properly in front and behind.
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

  // It begins, it holds, and the breath fails.
  const front = Math.min(1, progress / BREATH_REACH_END);
  const release = clamp01(normalize((progress - BREATH_RELEASE_AT) / (1 - BREATH_RELEASE_AT)));
  // It thins and scatters at the end; as one cone that goes more naturally than trimming it from the mouth.
  const life = 1 - release ** 1.4;
  const dissipate = 1 + release * 0.4;
  /**
   * The speed of the flow, taken from the elapsed time rather than the playback position.
   * Driven by the proportion, a longer breath moves more slowly inside and loses its force.
   */
  const flow = preset.duration / BREATH_FLOW_MS;
  // How much is breathed out pulses; an even amount never reads as blowing.
  const swell = 1 + Math.sin(progress * flow * 4.4) * 0.13;

  // The cone is one shape; split into sections, the differences between them show as bands.
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

  // The swirls rolling along the edge, whose turbulence is what makes a straight cone read as gas.
  // Regular in side and size they read as a spinning ornament, so each is broken up.
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

  // The streaks running along the axis; with nothing visibly flowing it is only coloured mist adrift.
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

  // The tip unravels and scatters wide; left narrow it is merely a cone.
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

  // The smoke in the flow; light alone gives gas no density.
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
    // The gas breaks on the struck face and curls back towards the caster.
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
 * The particles scattered along the way, different things by element.
 *
 * A cone and a colour alone would look like the same thing flying in different colours,
 * Sparks burst outwards, ice drifts and glints, a discharge runs partway, leaves whirl and haze bleeds into the flow.
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
    // The further from the flow, the further it flies; in a straight line they read as a band.
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
        // The bursting sparks, drawn out along their travel and scattering smaller further on.
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
        // The ice crystals, turning slowly and glinting.
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
        // The discharge that runs partway, flickering rather than held on.
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
        // The leaves, turned over and over so they read as caught in the wind.
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
        // The dark haze bleeding into the flow, given no outline and only adding density.
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
 * How it widens from the mouth to the tip: narrow at the root and scattering wide ahead.
 *
 * A neat triangle reads as an even jet from a nozzle, so waves out of phase are laid over
 * each other to make the edge waver, and that waver runs forward.
 */
function breathSpread(at: number, progress: number): number {
  const roll = Math.sin(at * 7.3 - progress * 11) * 0.1 + Math.sin(at * 13.1 + progress * 6.2) * 0.05;
  return (0.4 + at ** 0.8 * 2.1) * (1 + roll);
}

/** A drain: light flowing back from the target to the caster, over and over. */
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
  // The swell runs across the path. Offset along the world axis it would, for some
  // directions, only move back and forth along the path and never arc.
  const acrossX = -Math.sin(radians);
  const acrossY = Math.cos(radians);

  for (let mote = 0; mote < DRAIN_MOTE_COUNT; mote++) {
    // Particles out of phase flowing over and over are what makes it read as being drained.
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
      // It is drawn out along the flow; left round it merely blinks.
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
