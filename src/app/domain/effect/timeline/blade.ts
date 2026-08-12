import { isEffectKind, type SlashStyle } from '@axe/domain/effect/effect-kind';
import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import { crackSvg, crescentSvg, ringSvg } from '@axe/domain/effect/effect-shapes';
import { projectDirection, type ViewRotation } from '@axe/domain/effect/effect-view';
import { appendGoreStain } from '@axe/domain/effect/timeline/body';
import {
  appendFlareSpikes,
  blank,
  clamp01,
  colorsOf,
  easeOutCubic,
  type EffectSprite,
  glow,
  type ImpactPainter,
  normalize,
  type Point3,
  takeRandoms,
} from '@axe/domain/effect/timeline/shared';

/**
 * 刃。
 *
 * 斬撃・居合・両断と、空から降る大剣。締めの爆ぜ方は渡された側に委ねる。
 */

const BISECT_PIECE_SCALE = 0.62;
const BISECT_GUSH_COUNT = 7;
/** 斬り口で分けた 2 枚。`clip` は絵のどちら側を残すか。 */
const BISECT_HALVES = [
  { key: 'upper', side: 1, drop: 0.3, clip: 'polygon(-40% -40%, 140% -110%, 140% 40%, -40% 110%)' },
  { key: 'lower', side: -1, drop: 1.5, clip: 'polygon(-40% 110%, 140% 40%, 140% 140%, -40% 140%)' },
];
/** 斬り抜けるまで。 */
const BISECT_CUT_END = 0.22;
const BISECT_ANGLE = -28;
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
 * 振り下ろす先の角度。真上(0)からここまで回す。
 *
 * 素直に heading+90 を使うと、対象の向きによっては 180 度を跨いで
 * 刃が盤面の下をくぐる。近いほうへ回し、水平を少し超えたところで止める。
 */
export function swingTiltOf(headingAngle: number): number {
  let tilt = (headingAngle + 90) % 360;
  if (tilt > 180) tilt -= 360;
  if (tilt <= -180) tilt += 360;
  return Math.max(-EXCALIBUR_MAX_TILT, Math.min(EXCALIBUR_MAX_TILT, tilt));
}

/** 光の大剣。立ち上る・刃になる・振り下ろす・弾ける、の四段。 */
const EXCALIBUR_RISE_END = 0.24;
const EXCALIBUR_FORM_END = 0.5;
export const EXCALIBUR_SWING_END = 0.68;
/** 刃の最短の長さ。間合いが近くても剣に見える太さを保つ。 */
const EXCALIBUR_MIN_REACH = 6;
/** 振り下ろす角度の限界。これを超えると刃が盤面の下をくぐってしまう。 */
const EXCALIBUR_MAX_TILT = 100;

/**
 * 撃ち手の足元から光が立ち上って巨大な刃になり、地面を支点に対象へ振り下ろされる。
 *
 * 刃は中心ではなく根元で回す。中心で回すと振り下ろしではなく回転に見える。
 */
export function appendSkyblade(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  origin: Point3,
  view: ViewRotation | null | undefined,
  paintImpact: ImpactPainter
): void {
  const rise = clamp01(progress / EXCALIBUR_RISE_END);
  const form = clamp01(normalize((progress - EXCALIBUR_RISE_END) / (EXCALIBUR_FORM_END - EXCALIBUR_RISE_END)));
  const swing = clamp01(normalize((progress - EXCALIBUR_FORM_END) / (EXCALIBUR_SWING_END - EXCALIBUR_FORM_END)));
  const burst = clamp01(normalize((progress - EXCALIBUR_SWING_END) / (1 - EXCALIBUR_SWING_END)));

  const heading = projectDirection(center.x - origin.x, center.y - origin.y, center.z - origin.z, view);
  const span = Math.hypot(center.x - origin.x, center.y - origin.y, center.z - origin.z);
  const reach = Math.max(span, base * EXCALIBUR_MIN_REACH);

  // 1. 立ち上る光。足元から吸い上がって刃の背丈まで届く。
  if (rise > 0 && form < 1) {
    for (let index = 0; index < 8; index += 1) {
      const phase = (rise * 1.6 + index / 8) % 1;
      sprites.push({
        ...blank(),
        key: `${prefix}-excalibur-rise-${index}`,
        x: origin.x,
        y: origin.y,
        z: origin.z,
        offsetX: Math.cos(index * 2.1) * base * 0.8 * (1 - phase),
        offsetY: -reach * phase * 0.9,
        width: base * 0.22 * (1 - phase),
        height: base * 0.22 * (1 - phase),
        opacity: (1 - phase) * 0.85 * (1 - form),
        background: preset.colorPrimary,
        borderRadius: '50%',
        shadow: glow(base * 0.35 * (1 - phase), preset.colorPrimary),
      });
    }
  }

  // 2〜3. 刃。伸び切ってから、根元を軸に対象へ倒す。
  if (rise >= 1 || form > 0 || swing < 1) {
    const length = reach * (0.15 + easeOutCubic(form) * 0.85);
    const eased = swing < 0.5 ? 2 * swing * swing : 1 - Math.pow(-2 * swing + 2, 2) / 2;
    const tilt = eased * swingTiltOf(heading.angle);
    const radians = (tilt * Math.PI) / 180;
    // 根元を撃ち手の足元へ固定する。中心は刃の向きへ半分ぶんずれる。
    const pivotX = (length / 2) * Math.sin(radians);
    const pivotY = -(length / 2) * Math.cos(radians);
    const alive = 1 - burst * 0.85;

    for (const [index, layer] of [
      { width: 2.6, alpha: 0.26, color: preset.colorSecondary, blur: 2.8 },
      { width: 1.3, alpha: 0.78, color: preset.colorPrimary, blur: 1.5 },
      { width: 0.45, alpha: 1, color: '#ffffff', blur: 0.8 },
    ].entries()) {
      sprites.push({
        ...blank(),
        key: `${prefix}-excalibur-blade-${index}`,
        x: origin.x,
        y: origin.y,
        z: origin.z,
        offsetX: pivotX,
        offsetY: pivotY,
        width: base * layer.width * (0.4 + form * 0.6),
        height: length,
        rotate: tilt,
        opacity: layer.alpha * (0.3 + form * 0.7) * alive,
        background: `linear-gradient(180deg, transparent, ${layer.color} 18%, #ffffff 100%)`,
        borderRadius: '46% 46% 8% 8%',
        shadow: glow(base * layer.blur, layer.color),
      });
    }

    // 根元の光輪。支点がどこかを見せる。
    sprites.push({
      ...blank(),
      key: `${prefix}-excalibur-hilt`,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      width: base * (1.6 + form * 1.2),
      height: base * (0.6 + form * 0.4),
      opacity: (0.4 + form * 0.5) * alive,
      background: `radial-gradient(circle, #ffffff, ${preset.colorPrimary} 50%, transparent 74%)`,
      borderRadius: '50%',
      shadow: glow(base * 0.8, preset.colorPrimary),
    });
  }

  // 4. 爆発。振り切った先で弾け、輪が広がる。
  if (burst > 0) {
    // 属性を持たせた大剣は、締めの弾け方をその属性へ委ねる（炎なら燃え、氷なら凍る）。
    if (isEffectKind(preset.impactKind) && preset.impactKind !== 'projectile') {
      paintImpact(
        preset.impactEffectKind,
        sprites,
        `${prefix}-excalibur-impact`,
        center,
        base * 1.2,
        burst,
        preset,
        () => 0.5
      );
    }
    sprites.push({
      ...blank(),
      key: `${prefix}-excalibur-burst`,
      x: center.x,
      y: center.y,
      z: center.z,
      width: base * (2.4 + easeOutCubic(burst) * 6),
      height: base * (2.4 + easeOutCubic(burst) * 6),
      opacity: 1 - burst,
      background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 40%, ${preset.colorSecondary} 64%, transparent 80%)`,
      borderRadius: '50%',
      shadow: glow(base * 2 * (1 - burst), preset.colorPrimary),
    });
    sprites.push({
      ...blank(),
      key: `${prefix}-excalibur-ring`,
      x: center.x,
      y: center.y,
      z: center.z,
      width: base * (1.6 + easeOutCubic(burst) * 11),
      height: base * (0.7 + easeOutCubic(burst) * 4.6),
      opacity: (1 - burst) * 0.8,
      svg: ringSvg(colorsOf(preset)),
      shadow: glow(base * 0.8 * (1 - burst), preset.colorSecondary),
    });
    for (let index = 0; index < 10; index += 1) {
      const phase = clamp01(burst * (1 + (index % 3) * 0.2));
      sprites.push({
        ...blank(),
        key: `${prefix}-excalibur-shard-${index}`,
        x: center.x,
        y: center.y,
        z: center.z,
        offsetX: Math.cos(index * 0.63) * base * 5 * phase,
        offsetY: -Math.abs(Math.sin(index * 0.63)) * base * 4 * phase,
        width: base * 0.3 * (1 - phase),
        height: base * 0.3 * (1 - phase),
        opacity: (1 - phase) * 0.9,
        background: '#ffffff',
        borderRadius: '50%',
        shadow: glow(base * 0.4 * (1 - phase), preset.colorPrimary),
      });
    }
  }
}

/**
 * 両断。一閃のあと、コマの絵が斬り口で 2 つにずれ、その間から血が噴き出す。
 */
export function appendBisect(
  sprites: EffectSprite[],
  prefix: string,
  center: Point3,
  base: number,
  progress: number,
  preset: EffectPreset,
  random: () => number,
  image: string
): void {
  const cut = Math.min(1, progress / BISECT_CUT_END);
  const after = clamp01(normalize((progress - BISECT_CUT_END) / (1 - BISECT_CUT_END)));
  const body = { x: center.x, y: center.y, z: center.z + base * 0.9 };
  const piece = base * BISECT_PIECE_SCALE;
  const radians = (BISECT_ANGLE * Math.PI) / 180;
  // 斬り口と直交する向き。2 つの断片はここへ開いていく。
  const acrossX = -Math.sin(radians);
  const acrossY = Math.cos(radians);

  if (cut < 1) {
    const reach = base * (1.5 + easeOutCubic(cut) * 5.5);
    sprites.push({
      ...blank(),
      key: `${prefix}-bisect-slash`,
      x: body.x,
      y: body.y,
      z: body.z,
      width: reach,
      height: base * 0.5 * (1 - cut * 0.6),
      rotate: BISECT_ANGLE,
      opacity: 1 - cut * 0.3,
      background: `linear-gradient(90deg, transparent, #ffffff 45%, ${preset.colorPrimary} 60%, transparent)`,
      borderRadius: '50%',
      shadow: glow(base * 0.5, preset.colorPrimary),
    });
  }

  if (after <= 0) return;

  const slide = easeOutCubic(after);
  const fade = 1 - clamp01((after - 0.55) / 0.45);

  if (image.length > 0) {
    // 上側と下側。斬り口で切り分け、互いに逆へ滑らせる。
    for (const half of BISECT_HALVES) {
      sprites.push({
        ...blank(),
        key: `${prefix}-bisect-${half.key}`,
        x: body.x,
        y: body.y,
        z: body.z,
        offsetX: acrossX * half.side * piece * slide * 0.9 + half.side * piece * slide * 0.25,
        offsetY: acrossY * half.side * piece * slide * 0.9 + piece * slide * slide * half.drop,
        width: piece * 2,
        height: piece * 2,
        rotate: half.side * slide * 7,
        opacity: fade,
        background: `url(${image}) center/contain no-repeat`,
        clipPath: half.clip,
      });
    }
  }

  // 断面。ずれた隙間が光り、そこから血が噴く。
  sprites.push({
    ...blank(),
    key: `${prefix}-bisect-seam`,
    x: body.x,
    y: body.y,
    z: body.z,
    width: base * 2.4,
    height: base * 0.18 * (1 - after * 0.5),
    rotate: BISECT_ANGLE,
    opacity: fade * 0.95,
    background: `linear-gradient(90deg, transparent, ${preset.colorPrimary} 25%, ${preset.colorSecondary} 65%, transparent)`,
    borderRadius: '50%',
  });

  const gush = takeRandoms(random, BISECT_GUSH_COUNT * 2);
  for (let jet = 0; jet < BISECT_GUSH_COUNT; jet++) {
    const seed = gush[jet * 2];
    const along = gush[jet * 2 + 1] - 0.5;
    const spurt = Math.min(1, after * (1.4 + seed));
    const reach = base * (0.7 + seed * 1.8) * easeOutCubic(spurt);
    const angle = BISECT_ANGLE + 90 + (along * 40 - 20);
    const jetRadians = (angle * Math.PI) / 180;
    sprites.push({
      ...blank(),
      key: `${prefix}-bisect-gush-${jet}`,
      x: body.x,
      y: body.y,
      z: body.z,
      offsetX: Math.cos((BISECT_ANGLE * Math.PI) / 180) * along * base * 1.6 + Math.cos(jetRadians) * reach * 0.5,
      offsetY: Math.sin((BISECT_ANGLE * Math.PI) / 180) * along * base * 1.6 + Math.sin(jetRadians) * reach * 0.5,
      width: reach,
      height: base * (0.07 + seed * 0.1),
      rotate: angle,
      opacity: fade * 0.9,
      background: `linear-gradient(90deg, ${preset.colorSecondary}, ${preset.colorSecondary} 40%, transparent)`,
      borderRadius: '50%',
    });
  }

  appendGoreStain(sprites, `${prefix}-bisect`, center, base, after, preset, gush, fade);
}

export function appendSlash(
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
