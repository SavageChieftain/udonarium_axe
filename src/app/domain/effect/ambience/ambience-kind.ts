/**
 * 盤面に敷きっぱなしにする環境演出の種類。
 *
 * 発動する演出と違って終わりが来ないので、外から決められるのは強さと色だけにする。
 * 一つの種類をマップ全体にも範囲にも使えるが、描き方は空側と地表側で分かれる。
 */
export type AmbienceKind =
  | 'fog'
  | 'rain'
  | 'snow'
  | 'ash'
  | 'ember'
  | 'sand'
  | 'miasma'
  | 'bloom'
  | 'swamp'
  | 'vent'
  | 'lava'
  | 'blaze'
  | 'frost';

/** マップ全体に掛ける種類。空から降るもの、空気に満ちるもの。 */
export const SKY_AMBIENCE_KINDS: readonly AmbienceKind[] = [
  'fog',
  'rain',
  'snow',
  'ash',
  'ember',
  'sand',
  'miasma',
  'bloom',
];

/** 範囲を区切って置く種類。地面に貼り付くもの。 */
export const GROUND_AMBIENCE_KINDS: readonly AmbienceKind[] = [
  'swamp',
  'blaze',
  'vent',
  'fog',
  'miasma',
  'lava',
  'frost',
  'bloom',
];

export interface AmbiencePalette {
  /** 粒と光の色。 */
  primary: string;
  /** 地面へ落とす影の色。 */
  secondary: string;
}

const PALETTES: Record<AmbienceKind, AmbiencePalette> = {
  fog: { primary: '#dce6f0', secondary: '#8c9bad' },
  rain: { primary: '#bcd8f0', secondary: '#3d5a78' },
  snow: { primary: '#ffffff', secondary: '#b9cfe4' },
  ash: { primary: '#b9b3ab', secondary: '#4a453f' },
  ember: { primary: '#ffb457', secondary: '#ff5a24' },
  sand: { primary: '#e2c48c', secondary: '#8a6a3c' },
  miasma: { primary: '#a86ecf', secondary: '#3d1f52' },
  bloom: { primary: '#9ff0d0', secondary: '#2f7d63' },
  swamp: { primary: '#8fd14f', secondary: '#2f4a1e' },
  vent: { primary: '#e8f0f4', secondary: '#7d8f99' },
  lava: { primary: '#ff8a33', secondary: '#8a1f08' },
  blaze: { primary: '#ffb02e', secondary: '#5c1a00' },
  frost: { primary: '#cfeaff', secondary: '#4b7fa8' },
};

const AMBIENCE_KIND_SET = new Set<string>(Object.keys(PALETTES));

export const DEFAULT_AMBIENCE_DENSITY = 0.6;

export function isAmbienceKind(value: unknown): value is AmbienceKind {
  return typeof value === 'string' && AMBIENCE_KIND_SET.has(value);
}

export function ambienceKindOf(value: unknown, fallback: AmbienceKind = 'fog'): AmbienceKind {
  return isAmbienceKind(value) ? value : fallback;
}

export function ambiencePalette(kind: AmbienceKind): AmbiencePalette {
  return PALETTES[kind];
}

/** 指定色。空なら種類ごとの既定色を使う。 */
export function ambienceColorOf(kind: AmbienceKind, color: string): string {
  const trimmed = typeof color === 'string' ? color.trim() : '';
  return trimmed.length > 0 ? trimmed : PALETTES[kind].primary;
}

/**
 * 塗りの強さ。
 *
 * 濃霧だけは上げきったときに前が見えなくなるところまで伸ばす。線形にすると途中が
 * 一気に重くなるので、下から中ほどは今までの薄さを保ち、上端だけ急に濃くする。
 */
export function ambienceWashLevel(kind: AmbienceKind, density: number): number {
  const level = ambienceDensityOf(density);
  return kind === 'fog' ? Math.pow(level, 1.6) : level;
}

export function ambienceDensityOf(value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_AMBIENCE_DENSITY;
  return Math.min(Math.max(numeric, 0), 1);
}
