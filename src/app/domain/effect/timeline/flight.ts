import { type ProjectileStyle } from '@axe/domain/effect/effect-kind';
import { type EffectPreset } from '@axe/domain/effect/effect-preset';
import {
  arrowSvg,
  blasterSvg,
  bulletSvg,
  cruiseSvg,
  flyingCrescentSvg,
  missileSvg,
  ringSvg,
  thrustSvg,
  tracerSvg,
} from '@axe/domain/effect/effect-shapes';
import { projectDirection, type ViewRotation } from '@axe/domain/effect/effect-view';
import {
  blank,
  clamp01,
  colorsOf,
  easeOutCubic,
  type EffectSprite,
  glow,
  type ImpactPainter,
  normalize,
  type Point3,
} from '@axe/domain/effect/timeline/shared';

/**
 * 飛んでいくもの。
 *
 * 撃ち手から的へ向かって動く演出（弾・砲・矢の雨）。着弾の描き方は渡された側に委ねる。
 */

/**
 * 弾が飛んでいる時間(ms)。再生時間に対する割合ではなく実時間で決める。
 * 割合にすると、連射のように尺の長いものほど弾が遅くなってしまう。
 */
const PROJECTILE_TRAVEL_MS: Record<ProjectileStyle, number> = {
  bullet: 130,
  arrow: 260,
  bolt: 340,
  crescent: 300,
  blaster: 110,
  tracer: 70,
  missile: 420,
  cruise: 1400,
};

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
/** 高さの取り方。放物線を描くか、巡航して終末で突っ込むか。 */
function loft(at: number, level: boolean): number {
  if (!level) return Math.sin(Math.PI * at);
  // 巡航高度まで一気に上がり、そこを保ったまま的の直前で一気に落とす。
  // 放り投げると迫撃砲に、緩く下ろすと着陸に見える。
  return Math.min(at / 0.16, 1) - Math.max(0, (at - 0.88) / 0.12) ** 1.7;
}

/** 噴煙を継ぐ区間数。 */
const SMOKE_SEGMENTS = 6;

/** 弾ごとに横ぶれの向きを振り分ける。同じ側ばかりだと束になって 1 発に見える。 */
const SWERVE_SIDE = [1, -1, 0.55, -0.55, 1.4, -1.4];

/** まっすぐ飛ぶ見た目。尾を粒に割らず 1 本に繋ぐ。 */
const STRAIGHT_LOOKS: ReadonlySet<ProjectileStyle> = new Set([
  'bullet',
  'blaster',
  'tracer',
  'crescent',
  'missile',
  'cruise',
]);

/** 尾の長さ(飛翔の割合)。速いものほど長く引く。 */
const TRAIL_SPAN: Record<ProjectileStyle, number> = {
  bolt: 0.3,
  arrow: 0.2,
  bullet: 0.22,
  crescent: 0.24,
  blaster: 0.3,
  tracer: 0.55,
  missile: 0.34,
  cruise: 0.55,
};

/** 進行方向に対する見た目の傾き。三日月は弧の腹を前へ向けたいので直交させる。 */
const PROJECTILE_TURN: Record<ProjectileStyle, number> = {
  bolt: 0,
  arrow: 0,
  bullet: 0,
  crescent: 0,
  blaster: 0,
  tracer: 0,
  missile: 0,
  cruise: 0,
};

/** 弧を描いて飛ぶ高さ。矢は山なりに、光り物と刃はまっすぐ飛ばす。 */
const PROJECTILE_ARC: Record<ProjectileStyle, number> = {
  bolt: 0.15,
  arrow: 1.1,
  bullet: 0.15,
  crescent: 0,
  blaster: 0,
  tracer: 0,
  missile: 0.5,
  cruise: 1.4,
};

/** 経路から横へ膨らむ量(base 比)。誘導弾は大きく回り込んでから食い付く。 */
const PROJECTILE_SWERVE: Record<ProjectileStyle, number> = {
  bolt: 0,
  arrow: 0,
  bullet: 0,
  crescent: 0,
  blaster: 0,
  tracer: 0,
  missile: 0.9,
  cruise: 2.4,
};

/** 尾の太さ(base 比)。頭の大きさから作ると、大きい刃で尾が帯のようになってしまう。 */
const TRAIL_THICKNESS: Record<ProjectileStyle, number> = {
  bolt: 0.34,
  arrow: 0.1,
  bullet: 0.16,
  crescent: 0.5,
  blaster: 0.26,
  tracer: 0.09,
  missile: 0.34,
  cruise: 0.5,
};

const PROJECTILE_SIZE: Record<ProjectileStyle, { width: number; height: number }> = {
  bolt: { width: 1.9, height: 0.5 },
  arrow: { width: 1.8, height: 0.36 },
  bullet: { width: 1.25, height: 0.22 },
  crescent: { width: 1.7, height: 1.7 },
  blaster: { width: 1.05, height: 0.34 },
  tracer: { width: 2.2, height: 0.09 },
  missile: { width: 1.7, height: 1.0 },
  cruise: { width: 2.8, height: 1.24 },
};

function projectileSvg(look: ProjectileStyle, colors: ReturnType<typeof colorsOf>): string {
  switch (look) {
    case 'arrow':
      return arrowSvg(colors);
    case 'crescent':
      return flyingCrescentSvg(colors);
    case 'blaster':
      return blasterSvg(colors);
    case 'tracer':
      return tracerSvg(colors);
    case 'missile':
      return missileSvg(colors);
    case 'cruise':
      return cruiseSvg(colors);
    default:
      return bulletSvg(colors);
  }
}

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
/** 打ち上げが終わる位置。ここまでで画面の外へ抜ける。 */
const BALLISTIC_LIFT_END = 0.32;
/** 落ち始める位置。間を空けて、見えない所を飛んでいる時間を作る。 */
const BALLISTIC_DIVE_START = 0.6;
/** 突き刺さる位置。ここから先が爆発。`EffectPreset.impactSoundAt` と揃える。 */
export const BALLISTIC_DIVE_END = 0.86;
/** 打ち上げと落下の高さ(base 比)。画面の外まで抜ける高さを取る。 */
const BALLISTIC_HEIGHT = 16;
/** 落ちてくる筋の区間数。 */
const BALLISTIC_TRAIL_SEGMENTS = 7;

/**
 * 弾道ミサイル。真上へ打ち上げ、見えない所を飛び、的の真上から落ちてくる。
 *
 * 打ち上げ → 予告 → 落下 → 爆発、の 4 段。撃った先が見えないぶん、
 * 落ちてくる場所を地面に描いておかないと、ただ画面外から爆発が湧く。
 */
export function appendBallistic(
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
  const colors = colorsOf(preset);
  const lift = clamp01(progress / BALLISTIC_LIFT_END);
  const dive = clamp01(normalize((progress - BALLISTIC_DIVE_START) / (BALLISTIC_DIVE_END - BALLISTIC_DIVE_START)));
  const burst = clamp01(normalize((progress - BALLISTIC_DIVE_END) / (1 - BALLISTIC_DIVE_END)));
  const body = { width: base * 2.4, height: base * 1.35 };

  // 1. 打ち上げ。足元から真上へ、加速しながら抜けていく。
  if (lift > 0 && lift < 1) {
    const up = projectDirection(0, 0, 1, view);
    const climbed = lift ** 1.9;
    const shrink = 1 - climbed * 0.45;
    const height = origin.z + base * BALLISTIC_HEIGHT * climbed;

    sprites.push({
      ...blank(),
      key: `${prefix}-ballistic-lift`,
      x: origin.x,
      y: origin.y,
      z: height,
      width: body.width * shrink,
      height: body.height * shrink,
      rotate: up.angle,
      opacity: 1 - climbed ** 4,
      svg: cruiseSvg(colors),
    });
    sprites.push({
      ...blank(),
      key: `${prefix}-ballistic-thrust`,
      x: origin.x,
      y: origin.y,
      z: height - body.width * shrink * 0.7,
      width: body.width * shrink * 0.8,
      height: body.height * shrink * 0.7,
      rotate: up.angle,
      opacity: (1 - climbed ** 4) * 0.9,
      svg: thrustSvg(colors),
    });
  }

  // 発射台の煙。打ち上げたあとも足元に残って広がる。
  const pad = clamp01(progress / BALLISTIC_DIVE_START);
  if (pad > 0 && pad < 1) {
    for (let puff = 0; puff < 4; puff += 1) {
      const spread = easeOutCubic(clamp01(pad * (1 + puff * 0.25)));
      sprites.push({
        ...blank(),
        key: `${prefix}-ballistic-pad-${puff}`,
        x: origin.x,
        y: origin.y,
        z: origin.z,
        offsetX: Math.cos(puff * 1.9) * base * 2.4 * spread,
        offsetY: -Math.abs(Math.sin(puff * 1.9)) * base * 1.2 * spread,
        width: base * (1.4 + spread * 3.4),
        height: base * (1.4 + spread * 3.4),
        opacity: (1 - pad) * 0.4,
        background: `radial-gradient(circle, ${preset.colorSecondary} 0%, transparent 70%)`,
        borderRadius: '50%',
      });
    }
  }

  // 2. 予告。落ちてくる位置を的の足元へ描いて絞り込む。
  const tell = clamp01(normalize((progress - BALLISTIC_LIFT_END) / (BALLISTIC_DIVE_END - BALLISTIC_LIFT_END)));
  if (tell > 0 && tell < 1) {
    for (let ring = 0; ring < 2; ring += 1) {
      const closing = clamp01(tell * (1 + ring * 0.3));
      sprites.push({
        ...blank(),
        key: `${prefix}-ballistic-mark-${ring}`,
        x: center.x,
        y: center.y,
        z: center.z,
        width: base * (4.5 - closing * 3),
        height: base * (4.5 - closing * 3),
        opacity: Math.min(tell * 4, 1) * (0.25 + (ring === 0 ? 0.3 : 0)),
        svg: ringSvg(colors, 5, ring === 0),
      });
    }
  }

  // 3. 落下。的の真上から、加速しながら突っ込む。
  if (dive > 0 && dive < 1) {
    const sky = { x: center.x + base * 1.6, y: center.y - base * 1.6, z: center.z + base * BALLISTIC_HEIGHT };
    const at = (value: number): Point3 => {
      const eased = clamp01(value) ** 1.9;
      return {
        x: sky.x + (center.x - sky.x) * eased,
        y: sky.y + (center.y - sky.y) * eased,
        z: sky.z + (center.z - sky.z) * eased,
      };
    };
    const head = at(dive);
    const drop = projectDirection(
      head.x - at(dive - 0.02).x,
      head.y - at(dive - 0.02).y,
      head.z - at(dive - 0.02).z,
      view
    );

    // 再突入の筋。経路に沿って継ぐ。
    for (let segment = 0; segment < BALLISTIC_TRAIL_SEGMENTS; segment += 1) {
      const front = at(dive - segment * 0.07);
      const back = at(dive - (segment + 1) * 0.07);
      const link = projectDirection(front.x - back.x, front.y - back.y, front.z - back.z, view);
      if (link.length < 0.5) continue;
      const age = segment / BALLISTIC_TRAIL_SEGMENTS;
      sprites.push({
        ...blank(),
        key: `${prefix}-ballistic-trail-${segment}`,
        x: (front.x + back.x) / 2,
        y: (front.y + back.y) / 2,
        z: (front.z + back.z) / 2,
        width: link.length * 1.1,
        height: base * 0.5 * (0.6 + age * 1.6),
        rotate: link.angle,
        opacity: (1 - age) * 0.5,
        background: `linear-gradient(90deg, transparent, ${preset.colorSecondary})`,
        borderRadius: '50%',
      });
    }

    sprites.push({
      ...blank(),
      key: `${prefix}-ballistic-shot`,
      x: head.x,
      y: head.y,
      z: head.z,
      width: body.width,
      height: body.height,
      rotate: drop.angle,
      opacity: 1,
      svg: cruiseSvg(colors),
    });
    // 再突入で灼ける弾頭。
    sprites.push({
      ...blank(),
      key: `${prefix}-ballistic-heat`,
      x: head.x,
      y: head.y,
      z: head.z,
      width: body.height * 1.4,
      height: body.height * 1.4,
      opacity: 0.75,
      background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 45%, transparent 72%)`,
      borderRadius: '50%',
    });
  }

  // 4. 爆発。属性の演出へ委ね、閃光と輪だけこちらで足す。
  if (burst > 0) {
    paintImpact(
      preset.impactEffectKind,
      sprites,
      `${prefix}-ballistic-impact`,
      center,
      base * 1.4,
      burst,
      preset,
      () => 0.5
    );
    sprites.push({
      ...blank(),
      key: `${prefix}-ballistic-flash`,
      x: center.x,
      y: center.y,
      z: center.z,
      width: base * (3 + easeOutCubic(burst) * 8),
      height: base * (3 + easeOutCubic(burst) * 8),
      opacity: (1 - burst) * 0.9,
      background: `radial-gradient(circle, #ffffff 0%, ${preset.colorPrimary} 38%, ${preset.colorSecondary} 62%, transparent 78%)`,
      borderRadius: '50%',
    });
    sprites.push({
      ...blank(),
      key: `${prefix}-ballistic-ring`,
      x: center.x,
      y: center.y,
      z: center.z,
      width: base * (2 + easeOutCubic(burst) * 14),
      height: base * (0.9 + easeOutCubic(burst) * 6),
      opacity: (1 - burst) * 0.7,
      svg: ringSvg(colors),
    });
  }
}

/** 降り注ぐ矢の本数。少ないと雨に見えない。 */
const ARROW_RAIN_COUNT = 36;
/** 射手が撃ち終えるまでの長さ(全体比)。 */
const ARROW_RAIN_LOOSE_END = 0.26;
/** 1 本が空へ昇っていく長さ(全体比)。 */
const ARROW_RAIN_CLIMB = 0.22;
/** 1 本が落ちきるまでの長さ(全体比)。 */
export const ARROW_RAIN_FALL = 0.18;
/** 落下を撒く区間。最後の 1 本が刺さり終わるまで尺に納める。 */
const ARROW_RAIN_SPREAD = 0.5;
/** 落下前に足元へ出す予告の長さ。どこへ落ちるか見せてから当てる。 */
const ARROW_RAIN_TELL = 0.14;
/** 矢が昇る高さ(base 比)。画面の外まで昇って、そこから降ってくる。 */
const ARROW_RAIN_HEIGHT = 9;

export interface ArrowRainShot {
  /** 弓を離れる位置(0-1)。 */
  loose: number;
  /** 落ち始める位置(0-1)。 */
  fall: number;
  /** 突き刺さる位置(0-1)。 */
  land: number;
}

/**
 * 矢 1 本ごとの撃つ・落ちる・刺さる。
 *
 * 絵と音の両方がこの表を見るので、種に依らず同じ並びを返す。
 */
export function arrowRainShots(): ArrowRainShot[] {
  const shots: ArrowRainShot[] = [];
  for (let index = 0; index < ARROW_RAIN_COUNT; index += 1) {
    // 等間隔だと機械仕掛けに聞こえるので、本数から決まるぶれを混ぜる。
    const wobble = (((index * 37) % 13) / 13 - 0.5) * 0.04;
    const fall = ARROW_RAIN_LOOSE_END + (index / ARROW_RAIN_COUNT) * ARROW_RAIN_SPREAD + wobble;
    shots.push({
      loose: (index / ARROW_RAIN_COUNT) * ARROW_RAIN_LOOSE_END,
      fall,
      land: fall + ARROW_RAIN_FALL,
    });
  }
  return shots;
}

/**
 * 降り注ぐ矢。射手が空へ撃ち上げ、落ちる位置を地面へ描いてから当てる。
 *
 * 撃ち上げ → 予告 → 落下 → 突き刺さり、の 4 段。撃ち上げを省くと矢がどこから
 * 湧いたのか分からず、予告を省くと当たった後で何が起きたかを知ることになる。
 */
export function appendArrowRain(
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
  const colors = colorsOf(preset);
  const shots = arrowRainShots();

  for (let index = 0; index < ARROW_RAIN_COUNT; index += 1) {
    const angle = random() * Math.PI * 2;
    const radius = base * (0.3 + random() * 1.9);
    const sway = (random() - 0.5) * base * 2.4;
    const lean = 0.6 + random() * 0.5;

    const spot = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius, z: center.z };
    const { loose, fall: launch, land } = shots[index];
    const sky = { x: spot.x - base * lean, y: spot.y - base * lean * 1.4, z: spot.z + base * ARROW_RAIN_HEIGHT };
    const drop = projectDirection(spot.x - sky.x, spot.y - sky.y, spot.z - sky.z, view);

    // 撃ち上げ。射手の足元から、的の方へ傾けて空へ抜けていく。
    const climb = normalize((progress - loose) / ARROW_RAIN_CLIMB);
    if (climb > 0 && climb < 1) {
      const apex = {
        x: origin.x + (center.x - origin.x) * 0.32 + sway,
        y: origin.y + (center.y - origin.y) * 0.32 + sway * 0.6,
        z: origin.z + base * ARROW_RAIN_HEIGHT,
      };
      // 昇るほど鈍る。等速だと打ち上げ花火のように伸びきってしまう。
      const eased = 1 - (1 - climb) ** 2;
      const rising = {
        x: origin.x + (apex.x - origin.x) * eased,
        y: origin.y + (apex.y - origin.y) * eased,
        z: origin.z + (apex.z - origin.z) * eased,
      };
      const ahead = {
        x: origin.x + (apex.x - origin.x) * Math.min(eased + 0.05, 1),
        y: origin.y + (apex.y - origin.y) * Math.min(eased + 0.05, 1),
        z: origin.z + (apex.z - origin.z) * Math.min(eased + 0.05, 1),
      };
      const heading = projectDirection(ahead.x - rising.x, ahead.y - rising.y, ahead.z - rising.z, view);
      sprites.push({
        ...blank(),
        key: `${prefix}-rain-loose-${index}`,
        x: rising.x,
        y: rising.y,
        z: rising.z,
        width: base * 1.4,
        height: base * 0.28,
        rotate: heading.angle,
        opacity: 1 - climb ** 3,
        svg: arrowSvg(colors),
      });
    }

    // 予告。落ちる位置の輪を絞り込んでいく。
    const tell = normalize((progress - (launch - ARROW_RAIN_TELL)) / (ARROW_RAIN_TELL + ARROW_RAIN_FALL));
    if (tell > 0 && tell < 1) {
      sprites.push({
        ...blank(),
        key: `${prefix}-rain-mark-${index}`,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        width: base * (1.4 - tell * 0.7),
        height: base * (1.4 - tell * 0.7),
        opacity: Math.min(tell * 3, 1) * 0.5,
        svg: ringSvg(colors, 6, true),
      });
    }

    // 落下。落ちる向きへ寝かせた矢と、後ろに引く細い筋。
    const fall = normalize((progress - launch) / ARROW_RAIN_FALL);
    if (fall > 0 && fall < 1) {
      const eased = fall ** 1.4;
      const head = {
        x: sky.x + (spot.x - sky.x) * eased,
        y: sky.y + (spot.y - sky.y) * eased,
        z: sky.z + (spot.z - sky.z) * eased,
      };
      sprites.push({
        ...blank(),
        key: `${prefix}-rain-trail-${index}`,
        x: head.x,
        y: head.y,
        z: head.z + base * 0.9,
        width: base * 1.6,
        height: base * 0.06,
        rotate: drop.angle,
        opacity: 0.35,
        background: `linear-gradient(90deg, transparent, ${preset.colorSecondary})`,
        borderRadius: '2px',
      });
      sprites.push({
        ...blank(),
        key: `${prefix}-rain-arrow-${index}`,
        x: head.x,
        y: head.y,
        z: head.z,
        width: base * 1.5,
        height: base * 0.3,
        rotate: drop.angle,
        opacity: 1,
        svg: arrowSvg(colors),
      });
    }

    // 突き刺さり。土埃と、地面に残って震える矢。
    const stuck = normalize((progress - land) / Math.max(1 - land, 0.01));
    if (stuck > 0 && stuck < 1) {
      sprites.push({
        ...blank(),
        key: `${prefix}-rain-dust-${index}`,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        width: base * (0.5 + easeOutCubic(stuck) * 1.6),
        height: base * (0.5 + easeOutCubic(stuck) * 1.6),
        opacity: (1 - stuck) * 0.55,
        background: `radial-gradient(circle, ${preset.colorSecondary} 0%, transparent 70%)`,
        borderRadius: '50%',
      });
      sprites.push({
        ...blank(),
        key: `${prefix}-rain-stuck-${index}`,
        x: spot.x,
        y: spot.y,
        z: spot.z,
        width: base * 1.1,
        height: base * 0.26,
        rotate: drop.angle + Math.sin(stuck * 34) * (1 - stuck) * 6,
        opacity: 1 - stuck * 0.8,
        svg: arrowSvg(colors),
      });
    }
  }
}

/**
 * 飛翔体。発射 → 飛翔 → 着弾の 3 段で組む。
 *
 * 飛翔中は「速度方向へ引き伸ばした頭」と「位置を繋いだ帯（リボン）」を出す。
 * 丸い粒を等間隔に並べても速度が出ないので、画面上の進行方向へ潰す・伸ばすのが要点。
 */
export function appendProjectile(
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
  const look = preset.projectileLook;
  const solid = look !== 'bolt';
  const arc = base * PROJECTILE_ARC[look];
  const timing = projectileTiming(preset);

  // 弾ごとに撃つ・飛ぶ・当たるが独立する。連射はこれを前へ詰めて並べたもの。
  timing.shots.forEach((shot, index) => {
    const travel = normalize((progress - shot.launch) / timing.travel);
    const shotKey = `${prefix}-s${index}`;

    if (travel > 0 && travel < 1) {
      appendFlyingShot(sprites, shotKey, center, base, travel, preset, origin, view, arc, look, index);
    }

    appendLaunchFlash(sprites, shotKey, base, travel, preset, origin, solid);

    const impact = normalize((progress - shot.land) / (1 - shot.land));
    if (impact > 0 && impact < 1) {
      // 着弾は属性ごとの演出へ委譲する。氷なら霜の輪、土なら地割れが出る。
      paintImpact(
        preset.impactEffectKind,
        sprites,
        `${shotKey}-impact`,
        center,
        base * 0.85,
        impact,
        preset,
        () => 0.5
      );
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
  look: ProjectileStyle,
  shotIndex: number
): void {
  const solid = look !== 'bolt';
  const swerve = base * PROJECTILE_SWERVE[look] * SWERVE_SIDE[shotIndex % SWERVE_SIDE.length];
  const at = (value: number): Point3 => flightPoint(origin, center, base, value, arc, swerve, look === 'cruise');
  const head = at(travel);

  // 尾。回り込むものは経路に沿って短い区間で継ぐ。1 本の弦で結ぶと弾だけ横を向いて見える。
  if (look === 'missile' || look === 'cruise') {
    const span = TRAIL_SPAN[look] / SMOKE_SEGMENTS;
    for (let segment = 0; segment < SMOKE_SEGMENTS; segment += 1) {
      const front = at(travel - segment * span);
      const back = at(travel - (segment + 1) * span);
      const link = projectDirection(front.x - back.x, front.y - back.y, front.z - back.z, view);
      if (link.length < 0.5) continue;
      const age = segment / SMOKE_SEGMENTS;
      sprites.push({
        ...blank(),
        key: `${prefix}-smoke-${segment}`,
        x: (front.x + back.x) / 2,
        y: (front.y + back.y) / 2,
        z: (front.z + back.z) / 2,
        width: link.length * 1.1,
        height: base * TRAIL_THICKNESS[look] * (0.5 + age * 1.4),
        rotate: link.angle,
        opacity: (1 - age) * 0.45,
        background: `linear-gradient(90deg, transparent, ${preset.colorSecondary})`,
        borderRadius: '50%',
      });
    }
  } else if (STRAIGHT_LOOKS.has(look)) {
    const tailAt = Math.max(0, travel - TRAIL_SPAN[look]);
    const tail = at(tailAt);
    const link = projectDirection(head.x - tail.x, head.y - tail.y, head.z - tail.z, view);
    if (link.length >= 0.5) {
      sprites.push({
        ...blank(),
        key: `${prefix}-trail`,
        x: (head.x + tail.x) / 2,
        y: (head.y + tail.y) / 2,
        z: (head.z + tail.z) / 2,
        width: link.length,
        height: base * TRAIL_THICKNESS[look],
        rotate: link.angle,
        opacity: 0.65,
        background: `linear-gradient(90deg, transparent, ${preset.colorSecondary} 45%, ${preset.colorPrimary})`,
        borderRadius: '9999px',
        shadow: glow(base * 0.16, preset.colorSecondary),
      });
    }
  } else {
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
      width: base * PROJECTILE_SIZE[look].width,
      height: base * PROJECTILE_SIZE[look].height,
      rotate: heading.angle + PROJECTILE_TURN[look],
      opacity: look === 'crescent' ? 0.95 : 1,
      svg: projectileSvg(look, colorsOf(preset)),
      shadow: look === 'blaster' || look === 'tracer' ? glow(base * 0.35, preset.colorPrimary) : '',
    });

    // 推進炎。弾の後ろへ付けると、飛んでいるのではなく飛ばしているように見える。
    if (look === 'missile' || look === 'cruise') {
      const flame = base * PROJECTILE_SIZE[look].width * 0.55;
      // 弾の長さぶんだけ後ろへ置く。1 フレームの進みで測ると、速さや間合いで離れ方が変わる。
      const step = base * PROJECTILE_SIZE[look].width * 0.62;
      const reach = Math.hypot(head.x - nose.x, head.y - nose.y, head.z - nose.z);
      const behind = reach > 0.001 ? step / reach : 0;
      sprites.push({
        ...blank(),
        key: `${prefix}-thrust`,
        x: head.x - (head.x - nose.x) * behind,
        y: head.y - (head.y - nose.y) * behind,
        z: head.z - (head.z - nose.z) * behind,
        width: flame,
        height: base * PROJECTILE_SIZE[look].height * 0.85,
        rotate: heading.angle,
        opacity: 0.85,
        svg: thrustSvg(colorsOf(preset)),
        shadow: glow(base * 0.3, preset.colorSecondary),
      });
    }
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
function flightPoint(
  origin: Point3,
  center: Point3,
  base: number,
  value: number,
  arc: number,
  swerve = 0,
  level = false
): Point3 {
  const clamped = Math.min(Math.max(value, 0), 1);
  // わずかに加速させる。等速だと矢というより漂う光になる。
  const eased = clamped ** 1.25;
  const point = {
    x: origin.x + (center.x - origin.x) * eased,
    y: origin.y + (center.y - origin.y) * eased,
    z: origin.z + (center.z + base * 0.6 - origin.z) * eased + loft(clamped, level) * arc,
  };
  if (swerve === 0) return point;

  // 経路と直交する向きへ膨らませる。盤面の上で回り込ませたいので水平面で取る。
  const dx = center.x - origin.x;
  const dy = center.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return point;

  // 早めに振ってから的へ収束させる。折り返しが中央だと、着弾間際まで的から外れて飛ぶ。
  const bulge = Math.sin(Math.PI * clamped ** 0.7) * swerve;
  return { ...point, x: point.x + (-dy / length) * bulge, y: point.y + (dx / length) * bulge };
}
