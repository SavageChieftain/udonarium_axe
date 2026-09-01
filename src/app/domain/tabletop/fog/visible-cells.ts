import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import {
  cellCenterOf,
  cellCount,
  CellGrid,
  forEachCell,
  forEachCellInBox,
  forEachNeighbourCell,
} from '@axe/domain/tabletop/fog/cell-grid';
import { SegmentIndexes } from '@axe/domain/tabletop/los/segment-index';
import { isLit, lightFloorPool, SceneVisionSource, seesInDark, VisionScene } from '@axe/domain/tabletop/vision-scene';
import { maxLobeScale, visionLobeScale } from '@axe/domain/tabletop/vision-shape';
import { VisionType } from '@axe/domain/tabletop/vision-types';

export interface VisibleCellsOptions {
  scene: VisionScene;
  grid: CellGrid;
  indexes: SegmentIndexes;
  /** The cells a wall stands on, so that the near face of one can be shown. */
  blocking?: CellBits;
  /** A guard against a board so large that one pass would stall the display. */
  maxCells?: number;
}

const DEFAULT_MAX_CELLS = 60_000;

export function computeVisibleCellsFor(source: SceneVisionSource, options: VisibleCellsOptions): CellBits {
  const { scene, grid } = options;
  const bits = new CellBits(cellCount(grid));
  if (source.type === VisionType.BLIND) return bits;
  const widest = maxLobeScale(source.lobes);
  if (widest <= 0) return bits;

  const index = options.indexes.above(source.z);
  const visited = new CellBits(cellCount(grid));
  const budget = options.maxCells ?? DEFAULT_MAX_CELLS;
  let spent = 0;

  const seen: number[] = [];
  const take = (cell: number): void => {
    bits.set(cell);
    seen.push(cell);
  };

  const consider = (cell: number, cx: number, cy: number): void => {
    if (spent >= budget) return;
    if (visited.get(cell)) return;
    visited.set(cell);
    spent++;

    const scale = visionLobeScale(source.lobes, source.direction, source.x, source.y, cx, cy);
    if (scale <= 0) return;
    const reach = Math.hypot(cx - source.x, cy - source.y);
    const withinRange = source.rangePx > 0 && reach <= source.rangePx * scale;
    if (source.type === VisionType.TRUESIGHT && withinRange) {
      take(cell);
      return;
    }
    if (!index.clearBetween(source.x, source.y, source.z, cx, cy, 0)) return;
    if (!scene.darknessEnabled || isLit(scene, cx, cy, true, 0)) {
      take(cell);
      return;
    }
    if (seesInDark(source.type) && withinRange) take(cell);
  };

  forEachCandidate(source, options, widest, consider);
  showNearWalls(source, options, bits, seen);
  return bits;
}

/**
 * The face of a wall that is turned towards the eye.
 *
 * A wall stops the look that would have landed on it, so the ground either side of it comes
 * out clear and the wall itself never does: what the reader sees is a shape of fog with no
 * telling whether something is standing there or the light simply ran out. The ring of wall
 * cells next to ground that can be seen is shown, which is the near half of a thick wall and
 * the whole of a thin one, and no further in than that.
 */
function showNearWalls(
  source: SceneVisionSource,
  options: VisibleCellsOptions,
  bits: CellBits,
  seen: readonly number[]
): void {
  const blocking = options.blocking;
  if (!blocking) return;
  const { grid } = options;

  for (const cell of seen) {
    forEachNeighbourCell(grid, cell, (neighbour) => {
      if (bits.get(neighbour) || !blocking.get(neighbour)) return;
      const centre = cellCenterOf(grid, neighbour);
      const scale = visionLobeScale(source.lobes, source.direction, source.x, source.y, centre.x, centre.y);
      if (scale <= 0) return;
      if (source.rangePx > 0 && Math.hypot(centre.x - source.x, centre.y - source.y) > source.rangePx * scale) return;
      bits.set(neighbour);
    });
  }
}

/**
 * The cells worth asking about, which is the ground a look could possibly land on.
 *
 * A range set on the piece bounds every one of them, so a short-sighted piece pays for its
 * own few cells however much of the board is lit.
 */
function forEachCandidate(
  source: SceneVisionSource,
  options: VisibleCellsOptions,
  widest: number,
  visit: (cell: number, cx: number, cy: number) => void
): void {
  const { scene, grid } = options;
  const reach = source.rangePx > 0 ? source.rangePx * widest : Infinity;
  const withinReach = (minX: number, minY: number, maxX: number, maxY: number): void =>
    forEachCellInBox(
      grid,
      Math.max(minX, source.x - reach),
      Math.max(minY, source.y - reach),
      Math.min(maxX, source.x + reach),
      Math.min(maxY, source.y + reach),
      visit
    );
  const everywhere = (): void => {
    if (Number.isFinite(reach)) withinReach(-Infinity, -Infinity, Infinity, Infinity);
    else forEachCell(grid, visit);
  };

  if (!scene.darknessEnabled || scene.globalIllumination > 0) {
    everywhere();
    return;
  }

  for (const light of scene.lights) {
    const pool = lightFloorPool(light);
    if (!pool) continue;
    withinReach(pool.cx - pool.dimPx, pool.cy - pool.dimPx, pool.cx + pool.dimPx, pool.cy + pool.dimPx);
  }

  if (seesInDark(source.type) && source.rangePx > 0) {
    withinReach(-Infinity, -Infinity, Infinity, Infinity);
  }
}
