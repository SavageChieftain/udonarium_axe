import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, sameCellGrid } from '@axe/domain/tabletop/fog/cell-grid';

export interface FogRecord {
  generation: number;
  grid: CellGrid;
  bits: CellBits;
  /** The pieces the party has met, kept alongside the ground and thrown away with it. */
  found: Set<string>;
}

export interface StoredFog {
  generation: number;
  bits: CellBits;
  found: ReadonlySet<string>;
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
  visible: CellBits,
  seen: ReadonlySet<string> = new Set()
): FogRecord {
  const generation = stored?.generation ?? 0;
  const fresh = !held || !sameCellGrid(held.grid, grid) || held.generation !== generation;
  const bits = fresh ? new CellBits(cellCount(grid)) : held.bits;
  const found = fresh ? new Set<string>() : held.found;
  if (stored) {
    bits.or(stored.bits);
    for (const identifier of stored.found) found.add(identifier);
  }
  bits.or(visible);
  for (const identifier of seen) found.add(identifier);
  return { generation, grid, bits, found };
}
