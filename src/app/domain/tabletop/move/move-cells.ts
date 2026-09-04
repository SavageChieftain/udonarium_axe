import { GameCharacter } from '@axe/domain/character/game-character';
import { DataElement, DataElementAttribute } from '@axe/domain/data/data-element';
import { convertMoveLength, isLengthUnit, MoveUnit, parseMoveUnit } from '@axe/domain/tabletop/move/move-units';

export const DEFAULT_MOVE_RANGE_ELEMENT_NAMES = '移動,移動力,Speed,速度';
export const DEFAULT_CELL_DISTANCE = 1;
export const DEFAULT_CELL_DISTANCE_UNIT: MoveUnit = 'cell';

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

/**
 * How many cells a piece walks, from what its sheet says and what the table counts in.
 *
 * A sheet written in cells is already the answer. A sheet written in a length is measured
 * against what one cell stands for, and where the two are written in different lengths -
 * thirty feet on the sheet, a table ruled in metres - the sheet is turned into the table's
 * unit first. A sheet with no unit anybody knows is taken to be in the table's own.
 */
export function moveCellsOf(
  character: GameCharacter,
  names: string,
  cellDistance: number,
  tableUnit: string = DEFAULT_CELL_DISTANCE_UNIT
): number | null {
  const root = character.rootDataElement;
  if (!root) return null;

  for (const name of parseMoveRangeElementNames(names)) {
    const element = DataElement.findElementByReference(root, name);
    if (!element) continue;
    const amount = amountOf(element);
    // A field that holds a dash where a number was meant is not an answer, so the next name
    // the table was given is asked instead of the whole question being given up on.
    if (amount === null) continue;
    return cellsFrom(amount, parseMoveUnit(element.getAttribute(DataElementAttribute.UNIT)), tableUnit, cellDistance);
  }
  return null;
}

function cellsFrom(amount: number, sheetUnit: MoveUnit | null, tableUnit: string, cellDistance: number): number {
  const ruledIn = parseMoveUnit(tableUnit);
  // Counted in cells on either side, the number is the answer: there is no length to measure
  // against, and a cell standing for so many cells is a sentence with nothing in it.
  if (sheetUnit === 'cell' || !isLengthUnit(ruledIn)) return Math.floor(amount);

  const measured = isLengthUnit(sheetUnit) ? convertMoveLength(amount, sheetUnit, ruledIn) : amount;
  return cellDistance > 0 ? Math.floor(measured / cellDistance) : Math.floor(measured);
}
