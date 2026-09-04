import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid } from '@axe/domain/tabletop/fog/cell-grid';
import { forEachMoveNeighbour } from '@axe/domain/tabletop/move/move-neighbours';

export const DEFAULT_REACH_BUDGET = 4000;

export function reachableCells(
  grid: CellGrid,
  start: number,
  cells: number,
  isBlocked: (index: number) => boolean,
  budget: number = DEFAULT_REACH_BUDGET
): CellBits {
  const total = cellCount(grid);
  const reached = new CellBits(total);
  if (start < 0 || start >= total || cells < 1 || budget < 1) return reached;

  const seen = new CellBits(total);
  seen.set(start);
  let frontier: number[] = [start];
  let spent = 0;
  let exhausted = false;

  for (let step = 0; step < cells && frontier.length > 0 && !exhausted; step++) {
    const next: number[] = [];
    for (const cell of frontier) {
      forEachMoveNeighbour(grid, cell, (neighbour) => {
        if (exhausted || seen.get(neighbour)) return;
        seen.set(neighbour);
        if (isBlocked(neighbour)) return;
        reached.set(neighbour);
        next.push(neighbour);
        spent++;
        if (spent >= budget) exhausted = true;
      });
      if (exhausted) break;
    }
    frontier = next;
  }
  return reached;
}

export function countCells(bits: CellBits): number {
  let found = 0;
  for (let index = 0; index < bits.count; index++) {
    if (bits.get(index)) found++;
  }
  return found;
}
