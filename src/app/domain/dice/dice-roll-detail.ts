/**
 * ダイスの中身。
 *
 * bcdice は振るたびに個々の出目と成否を返しているが、Axe はこれまで整形済みの文章だけを受け取り、
 * 残りをその場で捨てていた。そのため「1D100 で何が出たか」を後から数えられなかった。
 * ここはその中身を、発言に添えて持ち回れる形にする。
 *
 * 文章から読み直す道は取らない — 出力の言い回しはゲームシステムごとに違い、
 * `＞` の置換や改行の挿入まで通ったあとの文字列が相手になる。
 */

export type DiceRollOutcome = 'critical' | 'fumble' | 'success' | 'failure' | '';

export interface DiceRollFace {
  /** 面数。d6 なら 6。 */
  sides: number;
  /** 出た目。 */
  value: number;
  /** bcdice の区分。`normal` のほか `tens_d10` のような桁の別がある。 */
  kind: string;
}

export interface DiceRollDetail {
  /** ゲームシステム ID。 */
  system: string;
  faces: readonly DiceRollFace[];
  outcome: DiceRollOutcome;
}

/** bcdice の戻り値のうち、こちらが使う形だけを写す。 */
export interface DiceRollSource {
  detailedRands?: readonly { kind?: unknown; sides?: unknown; value?: unknown }[];
  rands?: readonly (readonly number[])[];
  success?: unknown;
  failure?: unknown;
  critical?: unknown;
  fumble?: unknown;
}

export function diceRollDetailOf(system: string, source: DiceRollSource | null | undefined): DiceRollDetail | null {
  if (!source) return null;

  const faces = facesOf(source);
  const outcome = outcomeOf(source);
  if (faces.length < 1 && outcome === '') return null;

  return { system, faces, outcome };
}

/** 発言に添えるための文字列。読めなければ落とす側で null になる。 */
export function encodeDiceRollDetail(detail: DiceRollDetail | null): string {
  if (!detail) return '';
  try {
    return JSON.stringify(detail);
  } catch {
    return '';
  }
}

export function parseDiceRollDetail(raw: string | null | undefined): DiceRollDetail | null {
  if (!raw || raw.length < 1) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<DiceRollDetail>;
    if (!parsed || typeof parsed !== 'object') return null;

    const faces = Array.isArray(parsed.faces) ? parsed.faces.filter(isFace) : [];
    const outcome = isOutcome(parsed.outcome) ? parsed.outcome : '';
    if (faces.length < 1 && outcome === '') return null;

    return { system: typeof parsed.system === 'string' ? parsed.system : '', faces, outcome };
  } catch {
    // 古い部屋データには別のものが入っていることがある。読めなければ「中身なし」で通す。
    return null;
  }
}

/** 出目だけを並べる。分布を数えるときに使う。 */
export function diceRollValues(detail: DiceRollDetail | null, sides?: number): number[] {
  if (!detail) return [];
  return detail.faces.filter((face) => sides == null || face.sides === sides).map((face) => face.value);
}

function facesOf(source: DiceRollSource): DiceRollFace[] {
  const detailed = source.detailedRands;
  if (Array.isArray(detailed)) {
    return detailed
      .map((entry) => ({
        sides: numberOf(entry?.sides),
        value: numberOf(entry?.value),
        kind: typeof entry?.kind === 'string' ? entry.kind : 'normal',
      }))
      .filter((face) => face.sides > 0);
  }

  // 古い形。`rands` は [出目, 面数] の順で並ぶ。
  const rands = source.rands;
  if (!Array.isArray(rands)) return [];
  return rands
    .map((pair) => ({ sides: numberOf(pair?.[1]), value: numberOf(pair?.[0]), kind: 'normal' }))
    .filter((face) => face.sides > 0);
}

function outcomeOf(source: DiceRollSource): DiceRollOutcome {
  // 大成功・大失敗は成功・失敗も同時に立つことがあるので、強いほうから見る。
  if (source.critical === true) return 'critical';
  if (source.fumble === true) return 'fumble';
  if (source.success === true) return 'success';
  if (source.failure === true) return 'failure';
  return '';
}

function isFace(value: unknown): value is DiceRollFace {
  if (!value || typeof value !== 'object') return false;
  const face = value as Partial<DiceRollFace>;
  return typeof face.sides === 'number' && face.sides > 0 && typeof face.value === 'number';
}

function isOutcome(value: unknown): value is DiceRollOutcome {
  return value === 'critical' || value === 'fumble' || value === 'success' || value === 'failure' || value === '';
}

function numberOf(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
