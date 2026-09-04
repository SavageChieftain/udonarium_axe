import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement } from '@axe/domain/data/data-element';

export const DEFAULT_MOVE_RANGE_ELEMENT_NAMES = '移動,移動力,Speed,速度';
export const DEFAULT_CELL_DISTANCE = 1;
export const DEFAULT_CELL_DISTANCE_UNIT = 'マス';

export function parseMoveRangeElementNames(names: string): string[] {
  return names
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function amountOf(element: DataElement): number | null {
  const raw = element.isNumberResource ? element.currentValue : element.value;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const text = `${raw}`.trim();
  if (text.length === 0) return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
}

export function moveCellsOf(character: GameCharacter, names: string, cellDistance: number): number | null {
  const root = character.rootDataElement;
  if (!root) return null;

  for (const name of parseMoveRangeElementNames(names)) {
    const element = DataElement.findElementByReference(root, name);
    if (!element) continue;
    const amount = amountOf(element);
    if (amount === null) return null;
    return cellDistance > 0 ? Math.floor(amount / cellDistance) : amount;
  }
  return null;
}
