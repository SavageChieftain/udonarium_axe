export function floatOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function roundOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.round(value) : fallback;
}

export function clampInRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
