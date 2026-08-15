import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import { impactStarSvg, ringSvg, type ShapeColors } from '@axe/domain/effect/effect-shapes';
import { projectDirection, type ViewRotation } from '@axe/domain/effect/effect-view';
import {
  along,
  appendFlareSpikes,
  blank,
  clamp01,
  colorsOf,
  easeOutCubic,
  type EffectSprite,
  glow,
  normalize,
  type Point3,
  pointBetween,
} from '@axe/domain/effect/timeline/shared';

/**
 * A beam.
 *
 * The heaviest beam and the thin one, in three beats: the firing, the holding and the cutting off.
 */

/** Where the thin beam finishes gathering and fires. */
const BEAM_CHARGE_END = 0.28;
/** Where the gathered light is crushed once, which is what makes the pause before the shot. */
const BEAM_SNAP_AT = 0.76;
/** How long the column takes to reach the target. A beam passes rather than grows. */
const BEAM_REACH_END = 0.09;
/** Where the second wave arrives. Full force from the first moment reads weaker than force laid on afterwards. */
const BEAM_SWELL_AT = 0.32;
/** Where the column begins to draw up from its foot. */
const BEAM_RELEASE_AT = 0.8;
const BEAM_SEGMENT_COUNT = 10;
const BEAM_CHARGE_RINGS = 3;
const BEAM_SURGE_COUNT = 3;
const BEAM_RING_COUNT = 3;
const BEAM_HELIX_DASHES = 6;
/** Which way the splash comes back from where it lands. */
const BEAM_SPLASH_ANGLES = [-56, -33, -12, 11, 34, 57];
/**
 * The layers of the column, from wide and faint on the outside to thin and white at the core.
 * One gives it a silhouette, and different waver on each layer keeps it from being an even bar.
 */
const BEAM_LAYERS = [
  { key: 'halo', width: 2.5, opacity: 0.22, wobble: 0.17 },
  { key: 'edge', width: 1.5, opacity: 0.52, wobble: 0.12 },
  { key: 'body', width: 0.95, opacity: 0.9, wobble: 0.07 },
  { key: 'core', width: 0.3, opacity: 1, wobble: 0.03 },
];
/** The bands wrapping the column: two half a turn apart to begin with, and two more once it grows. */
const BEAM_HELIX_STRANDS = [
  { phase: 0, late: false },
  { phase: Math.PI, late: false },
  { phase: Math.PI / 2, late: true },
  { phase: (Math.PI * 3) / 2, late: true },
];
/** Where the beam comes up and where it cuts off. Between them it holds. */
const RAY_OPEN_END = 0.12;
/** How many sections the beam is laid out in. Too few and it bends; too many and the seams show. */
const RAY_SEGMENTS = 14;
const RAY_CLOSE_START = 0.86;

/**
 * The thin beam, held on the target. It has none of the stages of the heaviest one,
 * and works by holding one line, burning where it lands, and letting the light rise like steam.
 */
export function appendRaybeam(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined
): void {
  const open = clamp01(progress / RAY_OPEN_END);
  const close = clamp01(normalize((progress - RAY_CLOSE_START) / (1 - RAY_CLOSE_START)));
  const alive = open * (1 - close);
  if (alive <= 0) return;

  // The path is laid out in sections; as one sheet it would foreshorten along the line of sight and break partway.
  const pulse = 1 + Math.sin(progress * Math.PI * 22) * 0.12;
  const layers = [
    { thick: 0.34, color: preset.colorSecondary, alpha: 0.5 },
    { thick: 0.18, color: preset.colorPrimary, alpha: 0.85 },
    { thick: 0.07, color: '#ffffff', alpha: 1 },
  ];

  for (let segment = 0; segment < RAY_SEGMENTS; segment += 1) {
    const from = segment / RAY_SEGMENTS;
    const to = (segment + 1) / RAY_SEGMENTS;
    const back = along(origin, center, from);
    const front = along(origin, center, to);
    const link = projectDirection(front.x - back.x, front.y - back.y, front.z - back.z, view);
    if (link.length < 0.5) continue;

    const mid = { x: (back.x + front.x) / 2, y: (back.y + front.y) / 2, z: (back.z + front.z) / 2 };
    layers.forEach((layer, index) => {
      sprites.push({
        ...blank(),
        key: `${prefix}-ray-${segment}-${index}`,
        x: mid.x,
        y: mid.y,
        z: mid.z,
        width: link.length * 1.12,
        height: base * layer.thick * pulse * alive,
        rotate: link.angle,
        opacity: layer.alpha * alive,
        background: layer.color,
        borderRadius: '1px',
        shadow: index === 0 ? glow(base * 0.4 * alive, preset.colorSecondary) : '',
      });
    });
  }

  // The point that burns, whose ring pulses small.
  sprites.push({
    ...blank(),
    key: `${prefix}-ray-burn`,
    x: center.x,
    y: center.y,
    z: center.z,
    width: base * (0.7 + Math.sin(progress * Math.PI * 16) * 0.1) * alive,
    height: base * (0.7 + Math.sin(progress * Math.PI * 16) * 0.1) * alive,
    opacity: alive,
    background: `radial-gradient(circle, #ffffff, ${preset.colorPrimary} 45%, transparent 72%)`,
    borderRadius: '50%',
    shadow: glow(base * 0.8 * alive, preset.colorPrimary),
  });

  // The light rising from the burn, whose upward movement is what says it is being held.
  for (let index = 0; index < 4; index += 1) {
    const phase = (progress * 2.4 + index * 0.25) % 1;
    sprites.push({
      ...blank(),
      key: `${prefix}-ray-smoke-${index}`,
      x: center.x,
      y: center.y,
      z: center.z,
      offsetX: (index - 1.5) * base * 0.16,
      offsetY: -base * (0.4 + phase * 1.5),
      width: base * 0.12 * (1 - phase),
      height: base * 0.12 * (1 - phase),
      opacity: (1 - phase) * 0.7 * alive,
      background: preset.colorPrimary,
      borderRadius: '50%',
    });
  }
}

/**
 * The heaviest beam: gathering, crushing, driving through, growing and drawing up.
 *
 * From the muzzle to the target it is one column, laid out in sections along the path.
 * Each section carries its own depth, so the pieces between sit properly in front and behind.
 *
 * Drawn as an even bar it is a sheet however brightly it glows. Layers give it a
 * silhouette, and the waver, the bands, the running rings and the splash are what make it flow.
 */
export function appendBeam(
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
  // The direction across the column within the billboard, along which the bands and rings are offset to wrap it.
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
  // The second wave. Thickening late reads as more force than full force from the first moment.
  const swell = clamp01((fired - BEAM_SWELL_AT) / 0.2);
  const release = clamp01((fired - BEAM_RELEASE_AT) / (1 - BEAM_RELEASE_AT));
  // It draws up from the foot and goes; thinned evenly it never looks spent.
  const foot = release ** 1.7;
  const swing = 1 + Math.sin(progress * 44) * 0.05;
  // It thins at close range, where the width would otherwise outrun the length and read as a lump.
  const span = 0.55 + Math.min(1, link.length / (base * 7)) * 0.45;
  const girth = (1 + swell * 0.34) * swing * span;
  const alive = 1 - release * 0.3;

  for (let segment = 0; segment < BEAM_SEGMENT_COUNT; segment++) {
    const from = Math.max(segment / BEAM_SEGMENT_COUNT, foot);
    const to = Math.min((segment + 1) / BEAM_SEGMENT_COUNT, reach);
    if (to <= from) continue;

    const mid = (from + to) / 2;
    const anchor = pointBetween(muzzle, impact, mid);
    // The sections overlap a little, so no seam shows.
    const length = link.length * (to - from) + base * 0.08;
    // It thickens a little towards the landing; straight and even it reads as plumbing.
    const taper = 1 + mid ** 3 * 0.28;

    for (const layer of BEAM_LAYERS) {
      // The waver follows the position along the path rather than the number of the section; a
      // width that jumps between sections reads as a row of beads rather than one tube.
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
        // The ends are not rounded; rounded per section it strings together like beads.
        // The softness of the edge comes from the gradient across each layer.
        borderRadius: '0',
        shadow: layer.key === 'core' ? glow(base * 0.5, '#ffffff', base * 1.4, preset.colorPrimary) : '',
      });
    }
  }

  // The bands wrapping the column, brighter and larger on the near side so it reads as round.
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
        // A band leans most where it crosses the column, and its lean moves in step with its depth.
        rotate: link.angle + face * 24,
        opacity: alive * strength * (0.3 + Math.max(face, 0) * 0.55),
        background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 30%, #ffffff 55%, transparent)`,
        borderRadius: '50%',
      });
    }
  }

  // The rings running along the column, which is what says the energy flows from the muzzle to the landing.
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

  // The torrent along the core, run faster than the rings so the inside and the outside differ.
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
      // It is drawn out along its travel; as a round lump it reads as a ball rolling down the column.
      background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 45%, #ffffff 72%, transparent)`,
      borderRadius: '0',
    });
  }

  appendBeamMuzzle(sprites, prefix, muzzle, base, progress, preset, girth, alive, release);
  if (reach >= 1 && release < 1) {
    appendBeamImpact(sprites, prefix, center, impact, base, progress, preset, colors, link.angle, girth, alive);
  }
}

/** The gathering: the light draws into the muzzle, the ring tightens, and it crushes once before firing. */
function appendBeamCharge(
  sprites: EffectSprite[],
  prefix: string,
  muzzle: Point3,
  base: number,
  charge: number,
  preset: EffectPreset,
  colors: ShapeColors
): void {
  // The crush: shrinking the swollen light once makes the shot that follows read stronger.
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
  // The ring that bursts at that moment, which is the signal to fire.
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

/** The muzzle: a white heat and a cross of light laid over each other, held while it fires. */
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

/** The landing: it bursts where the column strikes and throws a splash back towards the caster. */
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

  // The ring that closes on the column, which says the point of impact is the strongest place.
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

  // The splash: light broken on the struck face and thrown back towards the caster.
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

/** The fill of each layer: faint and wide outside, white-hot at the core with colour only at its edge. */
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
