import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  crackSvg,
  gravitySvg,
  impactStarSvg,
  ringSvg,
  speedLinesSvg,
  spikeSvg,
} from '@axe/domain/effect/effect-shapes';
import {
  appendFlareSpikes,
  blank,
  colorsOf,
  easeOutCubic,
  type EffectSprite,
  fadeInOut,
  glow,
  normalize,
  type Point3,
  takeRandoms,
} from '@axe/domain/effect/timeline/shared';

/**
 * 地面。
 *
 * 叩きつけ・瓦礫・隆起・きのこ雲のように、足元から起きるもの。
 */

const UPHEAVAL_SLAB_COUNT = 7;
/** 障壁。六角のドームが張られ、脈打って消える。 */
/**
 * 打撃。斬るのではなく潰す。
 * 当たった瞬間に星形が弾け、集中線が外へ抜ける。アニメの殴打の型をそのまま置く。
 */
export function appendBash(
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

/** 重力。輪が内へ縮み、中心へ引き込む。 */
export function appendGravity(
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

export function appendImpact(
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
export function appendRubble(
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
export function appendUpheaval(
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
export function appendMushroom(
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
