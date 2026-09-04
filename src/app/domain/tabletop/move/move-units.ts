/** What a distance on a sheet or on a table is counted in. */
export type MoveUnit = 'cell' | 'metre' | 'foot';

export const MOVE_UNITS: readonly MoveUnit[] = ['cell', 'metre', 'foot'];

const METRES_PER_FOOT = 0.3048;

const SPELLINGS: Record<MoveUnit, readonly string[]> = {
  cell: ['cell', 'cells', 'square', 'squares', 'sq', 'マス', 'ます', '格', '格子'],
  metre: ['metre', 'metres', 'meter', 'meters', 'm', 'ｍ', 'メートル', 'メーター', 'メール'],
  foot: ['foot', 'feet', 'ft', 'ｆｔ', 'フィート', 'フット', 'フイート'],
};

/**
 * Which unit a written one is, or nothing for one nobody here knows.
 *
 * A sheet is written by hand, in whatever the system it came from calls things, so the
 * spellings are taken as they are found rather than being asked for in one form.
 */
export function parseMoveUnit(text: string | null | undefined): MoveUnit | null {
  const normalized = (text ?? '').trim().toLowerCase();
  if (normalized.length < 1) return null;
  for (const unit of MOVE_UNITS) {
    if (SPELLINGS[unit].some((spelling) => spelling.toLowerCase() === normalized)) return unit;
  }
  return null;
}

/** Whether a unit measures a length, which a count of cells does not. */
export function isLengthUnit(unit: MoveUnit | null): unit is 'metre' | 'foot' {
  return unit === 'metre' || unit === 'foot';
}

/** The same distance said in the other unit. Cells are left alone, being nobody's length. */
export function convertMoveLength(amount: number, from: MoveUnit, to: MoveUnit): number {
  if (from === to || !isLengthUnit(from) || !isLengthUnit(to)) return amount;
  return from === 'foot' ? amount * METRES_PER_FOOT : amount / METRES_PER_FOOT;
}
