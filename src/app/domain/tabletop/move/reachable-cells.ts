import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid } from '@axe/domain/tabletop/fog/cell-grid';
import { forEachMoveNeighbour } from '@axe/domain/tabletop/move/move-neighbours';

export const DEFAULT_REACH_BUDGET = 4000;

export interface ReachOptions {
  /** How many cells may be looked at before the search gives up on a heavy table. */
  budget?: number;
  /** Whether a step across a corner is a step. A hex board has no corners to cut. */
  cutsCorners?: boolean;
  /** What entering a cell costs, in steps. One by default, and Infinity for one nobody enters. */
  costOf?: (index: number) => number;
  /** Whether entering a cell ends the walk there: it is reached, and nothing beyond it is. */
  stopsAt?: (index: number) => boolean;
}

/**
 * How far a piece walks, counted in steps rather than in cells.
 *
 * Ground of its own price is what tells this from a plain breadth-first walk: a cell may cost
 * two steps to enter, or a hundred, and the cheapest way to it is wanted rather than the one
 * with the fewest cells in it. Cells are settled a price at a time, so the first way found to
 * one is the cheapest there is, and each is looked at once.
 */
export function reachableCells(
  grid: CellGrid,
  start: number,
  cells: number,
  isBlocked: (index: number) => boolean,
  options: ReachOptions = {}
): CellBits {
  const budget = options.budget ?? DEFAULT_REACH_BUDGET;
  const cutsCorners = options.cutsCorners ?? true;
  const costOf = options.costOf;
  const stopsAt = options.stopsAt;
  const total = cellCount(grid);
  const reached = new CellBits(total);
  if (start < 0 || start >= total || cells < 1 || budget < 1) return reached;

  const seen = new CellBits(total);
  seen.set(start);
  const byStep = new Map<number, number[]>([[0, [start]]]);
  let waiting = 1;
  let spent = 0;
  let exhausted = false;

  for (let step = 0; step < cells && waiting > 0 && !exhausted; step++) {
    const walking = byStep.get(step);
    if (!walking) continue;
    byStep.delete(step);
    waiting -= walking.length;
    for (const cell of walking) {
      forEachMoveNeighbour(
        grid,
        cell,
        (neighbour) => {
          if (exhausted || seen.get(neighbour)) return;
          seen.set(neighbour);
          if (isBlocked(neighbour)) return;
          const price = costOf ? costOf(neighbour) : 1;
          if (!Number.isFinite(price)) return;
          const walked = step + Math.max(1, Math.ceil(price));
          if (walked > cells) return;
          reached.set(neighbour);
          spent++;
          if (spent >= budget) {
            exhausted = true;
            return;
          }
          if (stopsAt?.(neighbour)) return;
          const queue = byStep.get(walked);
          if (queue) queue.push(neighbour);
          else byStep.set(walked, [neighbour]);
          waiting++;
        },
        cutsCorners
      );
      if (exhausted) break;
    }
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
