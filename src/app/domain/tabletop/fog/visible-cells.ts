import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, forEachCell, forEachCellInBox } from '@axe/domain/tabletop/fog/cell-grid';
import { SegmentIndexes } from '@axe/domain/tabletop/los/segment-index';
import { isLit, lightFloorPool, SceneVisionSource, seesInDark, VisionScene } from '@axe/domain/tabletop/vision-scene';
import { maxLobeScale, visionLobeScale } from '@axe/domain/tabletop/vision-shape';
import { VisionType } from '@axe/domain/tabletop/vision-types';

export interface VisibleCellsOptions {
  scene: VisionScene;
  grid: CellGrid;
  indexes: SegmentIndexes;
  /** How far a look carries on a table with no dark in it. Zero for as far as the table goes. */
  sightRangePx: number;
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
      bits.set(cell);
      return;
    }
    if (!index.clearBetween(source.x, source.y, source.z, cx, cy, 0)) return;
    if (!scene.darknessEnabled || isLit(scene, cx, cy, true, 0)) {
      bits.set(cell);
      return;
    }
    if (seesInDark(source.type) && withinRange) bits.set(cell);
  };

  forEachCandidate(source, options, widest, consider);
  return bits;
}

function forEachCandidate(
  source: SceneVisionSource,
  options: VisibleCellsOptions,
  widest: number,
  visit: (cell: number, cx: number, cy: number) => void
): void {
  const { scene, grid } = options;
  const wholeBoard = (): void => forEachCell(grid, visit);

  if (!scene.darknessEnabled) {
    if (options.sightRangePx > 0) {
      const reach = options.sightRangePx * widest;
      forEachCellInBox(grid, source.x - reach, source.y - reach, source.x + reach, source.y + reach, visit);
    } else {
      wholeBoard();
    }
    return;
  }

  if (scene.globalIllumination > 0) {
    wholeBoard();
    return;
  }

  for (const light of scene.lights) {
    const pool = lightFloorPool(light);
    if (!pool) continue;
    forEachCellInBox(
      grid,
      pool.cx - pool.dimPx,
      pool.cy - pool.dimPx,
      pool.cx + pool.dimPx,
      pool.cy + pool.dimPx,
      visit
    );
  }

  if (seesInDark(source.type) && source.rangePx > 0) {
    const reach = source.rangePx * widest;
    forEachCellInBox(grid, source.x - reach, source.y - reach, source.x + reach, source.y + reach, visit);
  }
}
