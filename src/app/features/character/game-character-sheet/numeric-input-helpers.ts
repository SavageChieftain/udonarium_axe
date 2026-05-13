/**
 * シート系コンポーネントで `<input type="number">.valueAsNumber` をモデルに書き戻す
 * 際の共通ガード。`NaN` / `Infinity` は fallback に倒し、必要ならクランプ・整数化する。
 */

/** 有限値ならそのまま、無効なら fallback を返す。 */
export function floatOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/** 有限値を四捨五入して返す。無効なら fallback。 */
export function roundOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

/**
 * 有限値を [min, max] にクランプして返す。無効なら fallback。
 * fallback も範囲内に強制したい場合は呼び出し側で揃えること。
 */
export function clampInRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
