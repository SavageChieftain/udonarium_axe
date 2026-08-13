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
  fadeInOut,
  HOT,
  seededRandom,
  withAlpha,
} from '@axe/domain/effect/particles/shared';

/**
 * 範囲を区切って置く地表の演出。
 *
 * 面そのもの（毒沼の水面、溶岩の照り）は盤面に寝かせた 1 枚に、
 * 立ち上るもの（蒸気、瘴気）はカメラに正対させた 1 枚に分けて描く。
 * 寝かせた面だけだと吹き出しが横へ広がり、正対だけだと沼が浮いて見える。
 */
export interface GroundAmbienceSpec {
  kind: AmbienceKind;
  /** 空なら種類ごとの既定色。 */
  color: string;
  /** 0〜1。0 なら粒を出さない。 */
  density: number;
  elapsed: number;
  /** 描画領域(px)。 */
  width: number;
  height: number;
  /** 1 マスの大きさ(px)。粒の大きさは範囲の広さではなくマスに合わせる。 */
  unit: number;
  /** 位相ずらし(ms)。同じ場を並べても動きが揃わないようにする。 */
  phase?: number;
  /**
   * 立ち上りを奥行き方向へ何枚に分けたうちの何枚目か。
   *
   * 広い範囲に板を 1 枚だけ立てると、奥のものも手前のものも同じ深さに並ぶので、
   * 盤面に帯を貼っただけに見える。手前と奥で別々に立てて厚みを出す。
   */
  sliceIndex?: number;
  sliceCount?: number;
}

/** 立ち上りを何枚に分けるか。奥行きが浅いうちは 1 枚でよい。 */
export function vaporSliceCount(depth: number, unit: number): number {
  const cells = unit > 0 ? depth / unit : 0;
  return Math.min(Math.max(Math.round(cells / 2.5), 1), MAX_VAPOR_SLICES);
}

/** 立ち上りを描く板の高さ(マス)。炎の壁は高く伸びないと壁にならない。 */
export function vaporCellsOf(kind: AmbienceKind): number {
  return VAPOR_CELLS[kind] ?? DEFAULT_VAPOR_CELLS;
}

const SURFACE_SEED = 40993;
const VAPOR_SEED = 15683;
const MAX_SURFACE_PARTICLES = 420;
/**
 * 立ち上る粒の上限は板 1 枚あたりで数える。
 * 範囲全体で頭打ちにすると、広げるほど 1 枚が薄まって、離れた炎がいくつか浮くだけになる。
 */
const MAX_VAPOR_PER_SLICE = 150;
const MAX_VAPOR_SLICES = 5;
const DEFAULT_VAPOR_CELLS = 2.6;

const VAPOR_CELLS: Partial<Record<AmbienceKind, number>> = {
  blaze: 6.5,
  vent: 3.4,
  miasma: 3.2,
  fog: 2,
  frost: 1.8,
};
const DEFAULT_UNIT = 50;

/**
 * 1 マスあたりの水面の粒（密度 1 のとき）。
 * 面積(px²)を基準にすると、既定の 4×4 マスでは数個しか出ず沼に見えない。
 */
const SURFACE_PER_CELL: Record<AmbienceKind, number> = {
  swamp: 9,
  vent: 6,
  lava: 10,
  blaze: 18,
  frost: 14,
  miasma: 4,
  bloom: 10,
  fog: 0,
  rain: 0,
  snow: 0,
  ash: 0,
  ember: 0,
  sand: 0,
};

/** 幅 1 マスあたりの立ち上る粒（密度 1 のとき）。 */
const VAPOR_PER_CELL: Record<AmbienceKind, number> = {
  vent: 14,
  swamp: 8,
  fog: 12,
  miasma: 8,
  lava: 10,
  blaze: 70,
  frost: 6,
  bloom: 8,
  rain: 0,
  snow: 0,
  ash: 0,
  ember: 0,
  sand: 0,
};

/**
 * canvas の外へ取る余白（1 マスに対する比）。
 *
 * 粒は canvas の形に切り取られる。粒の直径が範囲と同じくらい大きいと、中心が真ん中に
 * あっても裾が枠で切られるので、透明度を落とすだけでは四角い切れ目が消えない。
 * 一番大きな粒の半径ぶん外へ canvas を広げ、枠の中で自然に消えきるようにする。
 */
const SURFACE_PAD_UNITS = 0.9;
/** 立ち上りの余白は一番大きな粒から決める。これに足す気持ちぶんの余裕。 */
const VAPOR_PAD_MARGIN_UNITS = 0.2;

/**
 * 盤面に寝かせて描く面。泡や照りのように、面の上で起きること。
 * 原点は範囲の左上。canvas は余白ぶん外へ広がる。
 */
export function groundSurfaceLayer(spec: GroundAmbienceSpec): EffectParticleLayer {
  const width = Math.max(spec.width, 0);
  const height = Math.max(spec.height, 0);
  const unit = unitOf(spec);
  const pad = unit * SURFACE_PAD_UNITS;
  const layer: EffectParticleLayer = {
    width: width + pad * 2,
    height: height + pad * 2,
    originX: pad,
    originY: pad,
    particles: [],
  };

  const density = ambienceDensityOf(spec.density);
  const cells = (width * height) / (unit * unit);
  const count = Math.min(Math.round(SURFACE_PER_CELL[spec.kind] * cells * density), MAX_SURFACE_PARTICLES);
  if (count < 1) return layer;

  const color = ambienceColorOf(spec.kind, spec.color);
  const shade = ambiencePalette(spec.kind).secondary;
  const random = seededRandom(SURFACE_SEED);
  const elapsed = elapsedOf(spec);
  const shortest = Math.min(width, height);

  for (let index = 0; index < count; index++) {
    const r = randomsOf(random);
    const particle = surfaceParticle(spec.kind, r, elapsed, width, height, unit, color, shade);
    if (!particle) continue;
    // 範囲の縁でも薄める。切れ目対策は余白が担うが、縁まで濃いと沼が四角く見える。
    particle.alpha *= falloff(
      Math.min(particle.x, width - particle.x, particle.y, height - particle.y),
      marginOf(unit * 0.6, shortest)
    );
    layer.particles.push(particle);
  }
  return layer;
}

/**
 * カメラに正対させて描く、立ち上るもの。原点は範囲の下辺の中央。
 * canvas は左右と上へ余白ぶん広がる。
 */
export function groundVaporLayer(spec: GroundAmbienceSpec): EffectParticleLayer {
  const width = Math.max(spec.width, 0);
  const height = Math.max(spec.height, 0);
  const unit = unitOf(spec);
  const largest = largestVapor(spec.kind);
  const padX = unit * (largest.width / 2 + VAPOR_PAD_MARGIN_UNITS);
  const padY = unit * (largest.height / 2 + VAPOR_PAD_MARGIN_UNITS);
  const layer: EffectParticleLayer = {
    width: width + padX * 2,
    height: height + padY * 2,
    originX: width / 2 + padX,
    originY: height + padY,
    particles: [],
  };

  const density = ambienceDensityOf(spec.density);
  const slices = Math.max(Math.round(spec.sliceCount ?? 1), 1);
  const sliceIndex = Math.max(Math.round(spec.sliceIndex ?? 0), 0);
  const total = Math.round((VAPOR_PER_CELL[spec.kind] * width * density) / unit);
  const count = Math.min(Math.round(total / slices), MAX_VAPOR_PER_SLICE);
  if (count < 1) return layer;

  const color = ambienceColorOf(spec.kind, spec.color);
  const shade = ambiencePalette(spec.kind).secondary;
  // 板ごとに種と位相をずらす。同じにすると手前と奥で同じ絵が重なって厚みが出ない。
  const random = seededRandom(VAPOR_SEED + sliceIndex * 7919);
  const elapsed = elapsedOf(spec) + sliceIndex * 211;
  const columns = Math.min(Math.max(Math.round(width / (unit * 1.8)), 1), 8);

  for (let index = 0; index < count; index++) {
    const r = randomsOf(random);
    const particle = vaporParticle(spec.kind, r, elapsed, width, height, unit, color, shade, columns);
    if (!particle) continue;
    particle.alpha *= falloff(width / 2 - Math.abs(particle.x), marginOf(unit * 0.5, width));
    layer.particles.push(particle);
  }
  return layer;
}

/**
 * 面そのものの塗り。
 *
 * 粒を出さない設定でも、ここだけは残す。沼が沼として読めなくなると、
 * 盤面から情報が消えてしまう。
 */
export function groundSurfaceWash(kind: AmbienceKind, color: string, density: number): string {
  const tint = ambienceColorOf(kind, color);
  const shade = ambiencePalette(kind).secondary;
  const strength = 0.45 + ambienceWashLevel(kind, density) * 0.55;

  switch (kind) {
    case 'swamp':
      return blobs(
        blob('32% 38%', tint, 0.72 * strength),
        blob('72% 66%', tint, 0.6 * strength),
        blob('50% 50%', shade, 0.85 * strength)
      );
    case 'lava':
      return blobs(
        blob('40% 44%', tint, 0.85 * strength),
        blob('66% 62%', tint, 0.7 * strength),
        blob('50% 50%', shade, 0.9 * strength)
      );
    case 'blaze':
      // 地面そのものは焼け跡として暗く沈める。明るく光らせると、
      // 燃えている地面ではなく光っている地面になる。明るさは炎が持つ。
      return blobs(
        blob('44% 46%', tint, 0.55 * strength),
        blob('64% 58%', tint, 0.45 * strength),
        blob('50% 50%', shade, 0.72 * strength)
      );
    case 'frost':
      return blobs(blob('50% 50%', tint, 0.62 * strength), blob('36% 62%', shade, 0.5 * strength));
    case 'fog':
      return blobs(blob('42% 46%', tint, 0.99 * strength), blob('58% 56%', tint, 0.95 * strength));
    case 'miasma':
      return blobs(blob('46% 48%', tint, 0.62 * strength), blob('50% 50%', shade, 0.72 * strength));
    case 'vent':
      return blob('50% 52%', shade, 0.6 * strength);
    case 'bloom':
      return blob('50% 50%', tint, 0.45 * strength);
    default:
      return '';
  }
}

/**
 * 箱の縁で必ず消える塊。
 * 既定の farthest-corner だと、中心を寄せた塊が箱からはみ出し、はみ出した側が直線で切られる。
 */
function blob(position: string, color: string, alpha: number): string {
  return (
    `radial-gradient(ellipse closest-side at ${position}, ${withAlpha(color, round(alpha))} 0%,` +
    ` ${withAlpha(color, round(alpha * 0.55))} 52%, transparent 100%)`
  );
}

function blobs(...layers: string[]): string {
  return layers.join(', ');
}

interface Randoms {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** 経過時間で乱数の消費数が変わらないよう、1 粒ぶんをまとめて取る。 */
function randomsOf(random: () => number): Randoms {
  return { a: random(), b: random(), c: random(), d: random(), e: random(), f: random() };
}

function elapsedOf(spec: GroundAmbienceSpec): number {
  const elapsed = Number.isFinite(spec.elapsed) ? spec.elapsed : 0;
  const phase = Number.isFinite(spec.phase) ? (spec.phase as number) : 0;
  return elapsed + phase;
}

function unitOf(spec: GroundAmbienceSpec): number {
  return Number.isFinite(spec.unit) && spec.unit > 0 ? spec.unit : DEFAULT_UNIT;
}

function surfaceParticle(
  kind: AmbienceKind,
  r: Randoms,
  elapsed: number,
  width: number,
  height: number,
  unit: number,
  color: string,
  shade: string
): EffectParticle | null {
  const x = r.a * width;
  const y = r.b * height;

  switch (kind) {
    case 'blaze': {
      // 燃えている地面は、焼けた黒い跡の上で熾火がまたたく。
      const ember = r.e > 0.3;
      const flicker = 0.3 + 0.7 * Math.sin(elapsed * (ember ? 0.007 : 0.0015) + r.c * 14);
      return {
        x,
        y,
        size: unit * (ember ? 0.12 + r.d * 0.16 : 0.4 + r.d * 0.5),
        angle: 0,
        stretch: ember ? 1 : 0.7,
        color: ember ? color : shade,
        alpha: clamp01((ember ? 0.5 + r.d * 0.5 : 0.3 + r.d * 0.3) * flicker),
        shape: ember ? 'glow' : 'smoke',
      };
    }
    case 'swamp': {
      const cycle = 1400 + r.c * 2200;
      const local = wrap(r.d * cycle + elapsed, cycle) / cycle;
      return {
        x,
        y,
        size: unit * (0.1 + local * 0.22),
        angle: 0,
        stretch: 1,
        color,
        alpha: fadeInOut(local, 0.4) * 0.85,
        shape: 'glow',
      };
    }
    case 'lava': {
      const pulse = 0.45 + 0.55 * Math.sin(elapsed * 0.0018 + r.c * 12);
      return {
        x,
        y,
        size: unit * (0.24 + r.d * 0.3),
        angle: 0,
        stretch: 0.7,
        color,
        alpha: clamp01((0.45 + r.d * 0.5) * pulse),
        shape: 'glow',
      };
    }
    case 'frost': {
      const twinkle = 0.35 + 0.65 * Math.sin(elapsed * 0.0026 + r.c * 15);
      return {
        x,
        y,
        size: unit * (0.08 + r.d * 0.12),
        angle: 0,
        stretch: 1,
        color,
        alpha: clamp01((0.35 + r.d * 0.5) * twinkle),
        shape: 'glow',
      };
    }
    case 'miasma': {
      return {
        x: wrap(x + Math.sin(elapsed * 0.0005 + r.c * 8) * unit * 0.5, width),
        y: wrap(y + Math.cos(elapsed * 0.0004 + r.d * 8) * unit * 0.4, height),
        size: unit * (0.6 + r.d * 0.8),
        angle: 0,
        stretch: 0.8,
        color,
        alpha: 0.16 + r.d * 0.2,
        shape: 'smoke',
      };
    }
    case 'bloom': {
      const pulse = 0.4 + 0.6 * Math.sin(elapsed * 0.0016 + r.c * 11);
      return {
        x: wrap(x + Math.sin(elapsed * 0.0004 + r.a * TAU) * unit * 0.3, width),
        y: wrap(y + Math.cos(elapsed * 0.00035 + r.b * TAU) * unit * 0.25, height),
        size: unit * (0.07 + r.d * 0.1),
        angle: 0,
        stretch: 1,
        color,
        alpha: clamp01((0.4 + r.d * 0.5) * pulse),
        shape: 'glow',
      };
    }
    case 'vent': {
      const pulse = 0.3 + 0.7 * Math.sin(elapsed * 0.0012 + r.c * 9);
      return {
        x,
        y,
        size: unit * (0.2 + r.d * 0.26),
        angle: 0,
        stretch: 0.6,
        color,
        alpha: clamp01((0.25 + r.d * 0.3) * pulse),
        shape: 'smoke',
      };
    }
    default:
      return null;
  }
}

interface RisingOptions {
  /** 1 粒が出てから消えるまで(ms)。 */
  life: number;
  /** 面の高さのうち、どこまで上るか(0〜1)。 */
  reach: number;
  /** 出はじめの大きさ（1 マスに対する比）。 */
  size: number;
  /** 上るにつれて増える大きさ（1 マスに対する比）。 */
  grow: number;
  alpha: number;
  /** 横揺れの幅（1 マスに対する比）。 */
  sway: number;
  shape: EffectParticle['shape'];
  /** true なら噴き出し口をまとめる。false なら面いっぱいに散らす。 */
  clustered: boolean;
  /** true なら暗いほうの色で描く。炎の上に立つ黒煙に使う。 */
  shaded?: boolean;
  /** true なら根元を白熱させ、上るほど色を落とす。 */
  hot?: boolean;
  /**
   * 上り方。1 で等速、2 以上なら根元にとどまってから伸びる。
   * 出た瞬間を一番速くすると、濃さが乗る頃には床から離れていて、宙に浮いた炎になる。
   */
  ease?: number;
  /** 縦の伸び。1 で正円、2 なら幅の 2 倍の高さになる。炎の舌はこれで作る。 */
  stretch?: number;
  /** 上るにつれて増える縦の伸び。 */
  stretchGrow?: number;
  /** 出はじめの高さ(0〜1)。炎の上に乗る煙は途中から始める。 */
  from?: number;
  /** 濃さの立ち上がり。小さいほど早く濃くなる。 */
  rise?: number;
  /**
   * 大きさのばらつき。既定は 0.7〜1.3 倍。
   * 大炎上は小さな舌と大きな柱が同居していないと、揃った焚き火にしか見えない。
   * bias を上げるほど小さいものが増え、大きいものが稀になる。
   */
  scaleMin?: number;
  scaleMax?: number;
  scaleBias?: number;
  /** 寿命のばらつき。1 で揃う。上げると同じ拍で消えなくなる。 */
  lifeSpread?: number;
}

/**
 * 種類ごとの立ち上り方。2 つ以上あるものは 1 粒ずつどちらかになる。
 * 炎は明るい舌と黒煙の 2 種類が要る。片方だけだと燃えているように見えない。
 */
const VAPOR_OPTIONS: Partial<Record<AmbienceKind, readonly RisingOptions[]>> = {
  vent: [{ life: 2400, reach: 1, size: 0.7, grow: 1.7, alpha: 0.75, sway: 0.5, shape: 'smoke', clustered: true }],
  swamp: [{ life: 5200, reach: 0.45, size: 0.8, grow: 1.5, alpha: 0.45, sway: 1, shape: 'smoke', clustered: false }],
  fog: [{ life: 8000, reach: 0.35, size: 1.5, grow: 1.3, alpha: 0.85, sway: 1.5, shape: 'smoke', clustered: false }],
  miasma: [{ life: 4200, reach: 0.8, size: 1, grow: 1.8, alpha: 0.6, sway: 1.1, shape: 'smoke', clustered: false }],
  lava: [{ life: 1800, reach: 0.7, size: 0.24, grow: -0.1, alpha: 0.9, sway: 0.6, shape: 'glow', clustered: true }],
  frost: [{ life: 6000, reach: 0.3, size: 0.9, grow: 1, alpha: 0.4, sway: 1.2, shape: 'smoke', clustered: false }],
  bloom: [{ life: 5000, reach: 0.85, size: 0.18, grow: 0, alpha: 0.85, sway: 0.9, shape: 'glow', clustered: false }],
  blaze: [
    // 燃えているのは地面なので、まず床に張りつく火床を敷く。
    // これが無いと、炎が宙に浮いて焚き火の煙のように見える。
    {
      life: 900,
      reach: 0.1,
      size: 1.3,
      grow: 0.25,
      alpha: 0.6,
      sway: 0.12,
      shape: 'glow',
      clustered: false,
      hot: true,
      stretch: 0.8,
      stretchGrow: 0.4,
      rise: 0.18,
      scaleMin: 0.7,
      scaleMax: 1.8,
      scaleBias: 1.2,
      lifeSpread: 0.6,
    },
    {
      life: 620,
      reach: 0.5,
      size: 0.72,
      grow: -0.42,
      alpha: 0.62,
      sway: 0.22,
      shape: 'glow',
      clustered: false,
      hot: true,
      ease: 1.7,
      stretch: 2.2,
      stretchGrow: 1.4,
      rise: 0.05,
      scaleMin: 0.6,
      scaleMax: 1.8,
      scaleBias: 1.3,
      lifeSpread: 0.5,
    },
    {
      life: 1400,
      reach: 0.95,
      size: 0.8,
      grow: -0.48,
      alpha: 0.55,
      sway: 0.45,
      shape: 'glow',
      clustered: false,
      hot: true,
      ease: 2,
      stretch: 2.8,
      stretchGrow: 2.2,
      rise: 0.05,
      scaleMin: 0.7,
      scaleMax: 2.6,
      scaleBias: 1.5,
      lifeSpread: 0.6,
    },
    // 舞い上がる火の粉。高いところまで散らばる光があると、火の規模が一気に大きく見える。
    {
      life: 2200,
      reach: 1,
      size: 0.07,
      grow: -0.03,
      alpha: 1,
      sway: 2.4,
      shape: 'glow',
      clustered: false,
      hot: true,
      ease: 1.2,
      stretch: 1.6,
      stretchGrow: 0.6,
      rise: 0.06,
      scaleMin: 0.5,
      scaleMax: 2,
      scaleBias: 2,
      lifeSpread: 0.8,
    },
    {
      life: 3400,
      reach: 1,
      from: 0.45,
      size: 0.6,
      grow: 2,
      alpha: 0.42,
      sway: 0.9,
      shape: 'smoke',
      clustered: false,
      shaded: true,
      scaleMin: 0.6,
      scaleMax: 1.6,
      scaleBias: 1.4,
      lifeSpread: 0.5,
    },
  ],
};

function vaporParticle(
  kind: AmbienceKind,
  r: Randoms,
  elapsed: number,
  width: number,
  height: number,
  unit: number,
  color: string,
  shade: string,
  columns: number
): EffectParticle | null {
  const variants = VAPOR_OPTIONS[kind];
  if (!variants || variants.length < 1) return null;
  const options = variants[Math.min(Math.floor(r.e * variants.length), variants.length - 1)];

  const life = options.life * (1 + (options.lifeSpread ?? 0) * (r.f - 0.5));
  const local = wrap(r.a * life + elapsed, life) / life;
  const climb = options.ease ? Math.pow(local, options.ease) : local;
  const from = options.from ?? 0;
  const base = options.clustered
    ? ((Math.floor(r.b * columns) + 0.5) / columns - 0.5) * width + (r.c - 0.5) * unit * 0.4
    : (r.b - 0.5) * width;

  return {
    x: base + Math.sin(elapsed * 0.0008 + r.a * TAU) * unit * options.sway * local,
    y: -(from + climb * (options.reach - from)) * height,
    size: unit * (options.size + options.grow * local) * scaleOf(options, r.d),
    angle: 0,
    stretch: (options.stretch ?? 1) + (options.stretchGrow ?? 0) * local,
    // 先端まで色を落とすと、加算合成では何も足さない粒ばかりになって炎が痩せる。
    // 白熱させるのは根元だけにして、あとは炎の色のまま濃さで消す。
    color: options.hot ? (local < 0.14 ? HOT : color) : options.shaded ? shade : color,
    alpha: clamp01(fadeInOut(local, options.rise ?? 0.22) * options.alpha * (0.7 + r.c * 0.6)),
    shape: options.shape,
  };
}

function scaleOf(options: RisingOptions, random: number): number {
  const min = options.scaleMin ?? 0.7;
  const max = options.scaleMax ?? 1.3;
  return min + (max - min) * Math.pow(random, options.scaleBias ?? 1);
}

/** 一番大きくなりうる粒の幅と高さ（1 マスに対する比）。canvas の余白はここから決める。 */
function largestVapor(kind: AmbienceKind): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const options of VAPOR_OPTIONS[kind] ?? []) {
    const scale = scaleOf(options, 1);
    // 大きさも伸びも寿命とともに変わる。両端だけ見ると、掛け合わせた最大を取り逃す。
    for (const local of [0, 0.5, 1]) {
      const size = (options.size + options.grow * local) * scale;
      if (size <= 0) continue;
      width = Math.max(width, size);
      height = Math.max(height, size * ((options.stretch ?? 1) + (options.stretchGrow ?? 0) * local));
    }
  }
  return { width, height };
}

const TAU = Math.PI * 2;

/**
 * 箱の縁へ近づくほど薄くする。
 * canvas は箱の形に切り取られるので、縁が濃いまま切れると四角い切れ目が出る。
 */
function falloff(distanceToEdge: number, margin: number): number {
  if (margin <= 0) return 1;
  return clamp01(distanceToEdge / margin);
}

/**
 * 薄める幅。大きな粒ほど広く取るが、狭い範囲では頭打ちにする。
 * 幅いっぱいまで薄めてしまうと、濃い芯が残らず何も置いていないように見える。
 */
function marginOf(desired: number, span: number): number {
  return Math.min(desired, span * 0.35);
}

function wrap(value: number, span: number): number {
  if (span <= 0) return 0;
  const remainder = value % span;
  return remainder < 0 ? remainder + span : remainder;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
