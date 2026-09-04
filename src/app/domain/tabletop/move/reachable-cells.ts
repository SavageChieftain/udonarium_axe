import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid } from '@axe/domain/tabletop/fog/cell-grid';
import { forEachMoveNeighbour } from '@axe/domain/tabletop/move/move-neighbours';

export const DEFAULT_REACH_BUDGET = 4000;

export interface ReachOptions {
  /** How many cells may be looked at before the search gives up on a heavy table. */
  budget?: number;
  /** Whether a step across a corner is a step. A hex board has no corners to cut. */
  cutsCorners?: boolean;
  /**
   * Whether a piece may come to rest on a cell it can otherwise walk through.
   *
   * A cell somebody is standing on is one you may pass but not stop on, where the table
   * says two pieces do not share one.
   */
  canRest?: (index: number) => boolean;
}

export function reachableCells(
  grid: CellGrid,
  start: number,
  cells: number,
  isBlocked: (index: number) => boolean,
  options: ReachOptions = {}
): CellBits {
  const budget = options.budget ?? DEFAULT_REACH_BUDGET;
  const cutsCorners = options.cutsCorners ?? true;
  const canRest = options.canRest;
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
      forEachMoveNeighbour(
        grid,
        cell,
        (neighbour) => {
          if (exhausted || seen.get(neighbour)) return;
          seen.set(neighbour);
          if (isBlocked(neighbour)) return;
          if (!canRest || canRest(neighbour)) reached.set(neighbour);
          next.push(neighbour);
          spent++;
          if (spent >= budget) exhausted = true;
        },
        cutsCorners
      );
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
