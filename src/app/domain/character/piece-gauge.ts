import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';

export interface PieceGauge {
  identifier: string;
  name: string;
  initial: string;
  current: number;
  max: number;
  ratio: number;
  inverted: boolean;
  color: string;
}

const FULL_COLOR = '#4caf50';
const HALF_COLOR = '#ffb300';
const LOW_COLOR = '#e53935';

const HALF_THRESHOLD = 0.5;
const LOW_THRESHOLD = 0.25;

export function gaugeRatio(current: number, max: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, current / max));
}

export function gaugeColor(ratio: number, inverted = false): string {
  const remaining = inverted ? 1 - ratio : ratio;
  if (remaining <= LOW_THRESHOLD) return LOW_COLOR;
  if (remaining <= HALF_THRESHOLD) return HALF_COLOR;
  return FULL_COLOR;
}

export function isGaugeShownOnPiece(element: DataElement): boolean {
  return element.getAttribute(DataElementAttribute.PIECE_GAUGE) === 'true';
}

/** マイナスリソース。増えるほど悪くなる（狂気度・汚染度など）。 */
export function isGaugeInverted(element: DataElement): boolean {
  return element.getAttribute(DataElementAttribute.GAUGE_INVERTED) === 'true';
}

/** コマに出す設定のリソースだけを、上から順に拾う。 */
export function selectPieceGauges(root: DataElement | null): PieceGauge[] {
  if (!root) return [];

  const gauges: PieceGauge[] = [];
  const walk = (element: DataElement) => {
    for (const child of element.children) {
      const data = child as DataElement;
      if (data.children.length > 0) {
        walk(data);
        continue;
      }
      if (!data.isNumberResource || !isGaugeShownOnPiece(data)) continue;

      const current = Number(data.currentValue);
      const max = Number(data.value);
      const ratio = gaugeRatio(current, max);
      const inverted = isGaugeInverted(data);
      gauges.push({
        identifier: data.identifier,
        name: data.name,
        initial: initialOf(data.name),
        current: Number.isFinite(current) ? current : 0,
        max: Number.isFinite(max) ? max : 0,
        ratio,
        inverted,
        color: gaugeColor(ratio, inverted),
      });
    }
  };
  walk(root);
  return gauges;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? [...trimmed][0] : '';
}
