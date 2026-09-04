import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCount, CellGrid, forEachCellInBox } from '@axe/domain/tabletop/fog/cell-grid';
import { rectangleSegments } from '@axe/domain/tabletop/los/segments';
import { surfaceOf } from '@axe/domain/tabletop/tabletop-object';
import { Terrain } from '@axe/domain/tabletop/terrain';

export function terrainBlocksMovement(terrain: Terrain): boolean {
  if (surfaceOf(terrain) !== 'floor') return false;
  if (!terrain.hasWall) return false;
  return !(terrain.isDoor && terrain.isDoorOpen);
}

function terrainBox(terrain: Terrain, gridSize: number): { minX: number; minY: number; maxX: number; maxY: number } {
  const edges = rectangleSegments(
    terrain.location.x,
    terrain.location.y,
    terrain.width * gridSize,
    terrain.depth * gridSize,
    terrain.rotate
  );
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const edge of edges) {
    minX = Math.min(minX, edge.x1, edge.x2);
    minY = Math.min(minY, edge.y1, edge.y2);
    maxX = Math.max(maxX, edge.x1, edge.x2);
    maxY = Math.max(maxY, edge.y1, edge.y2);
  }
  return { minX, minY, maxX, maxY };
}

export function blockedByTerrain(grid: CellGrid, terrains: readonly Terrain[]): CellBits {
  const bits = new CellBits(cellCount(grid));
  if (grid.sizePx <= 0) return bits;
  for (const terrain of terrains) {
    if (!terrainBlocksMovement(terrain)) continue;
    const box = terrainBox(terrain, grid.sizePx);
    forEachCellInBox(grid, box.minX, box.minY, box.maxX, box.maxY, (cell) => bits.set(cell));
  }
  return bits;
}
