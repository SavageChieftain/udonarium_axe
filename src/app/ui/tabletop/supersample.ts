export const SUPERSAMPLE_MAX_FACTOR = 4;
export const SUPERSAMPLE_MAX_BOX_PX = 512;

export function supersampleFactor(
  naturalPx: number,
  layoutPx: number,
  maxFactor = SUPERSAMPLE_MAX_FACTOR,
  maxBoxPx = SUPERSAMPLE_MAX_BOX_PX
): number {
  if (!Number.isFinite(naturalPx) || !Number.isFinite(layoutPx)) return 1;
  if (naturalPx <= 0 || layoutPx <= 0) return 1;

  const byNatural = Math.floor(naturalPx / layoutPx);
  const byBox = Math.floor(maxBoxPx / layoutPx);
  const factor = Math.min(byNatural, byBox, Math.floor(maxFactor));

  return 2 <= factor ? factor : 1;
}

export function supersampleOffsetPercent(factor: number): number {
  if (!(1 < factor)) return 0;
  return (50 * (factor - 1)) / factor;
}

export function supersampleInsetPercent(factor: number): number {
  if (!(1 < factor)) return 0;
  return -(factor - 1) * 50;
}

export type SupersampleAnchor = 'top' | 'bottom' | 'center';

export interface SupersampleTransformOptions {
  readonly factor: number;
  readonly anchor: SupersampleAnchor;
  readonly outer?: string;
  readonly inner?: string;
}

export function supersampleTransform(opts: SupersampleTransformOptions): string {
  const parts: string[] = [];
  if (opts.outer) parts.push(opts.outer);

  if (1 < opts.factor && opts.anchor !== 'center') {
    parts.push(`translateY(${trim(-supersampleOffsetPercent(opts.factor), 4)}%)`);
  }

  if (opts.inner) parts.push(opts.inner);
  if (1 < opts.factor) parts.push(`scale(${trim(1 / opts.factor, 6)})`);

  return parts.join(' ');
}

function trim(value: number, digits: number): string {
  return Number(value.toFixed(digits)).toString();
}
