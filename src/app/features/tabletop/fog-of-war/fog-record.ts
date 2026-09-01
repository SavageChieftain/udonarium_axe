import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, sameCellGrid } from '@axe/domain/tabletop/fog/cell-grid';

export interface FogRecord {
  generation: number;
  grid: CellGrid;
  bits: CellBits;
}

export interface StoredFog {
  generation: number;
  bits: CellBits;
}

/**
 * What this client holds of the party's map, after taking in what has arrived.
 *
 * The running total is thrown away rather than merged when the record it belongs to is gone:
 * a board that has been rebuilt on a different grid, or one somebody has cleared. Merged, a
 * clearing would last only until the next thing anybody saw, when the total that outlived it
 * would be written straight back over the top.
 */
export function mergeFogRecord(
  held: FogRecord | null,
  grid: CellGrid,
  stored: StoredFog | null,
  visible: CellBits
): FogRecord {
  const generation = stored?.generation ?? 0;
  const fresh = !held || !sameCellGrid(held.grid, grid) || held.generation !== generation;
  const bits = fresh ? new CellBits(cellCount(grid)) : held.bits;
  if (stored) bits.or(stored.bits);
  bits.or(visible);
  return { generation, grid, bits };
}
