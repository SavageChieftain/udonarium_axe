import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { cellCenterOf, CellGrid, cellIndexAt, CellPoint, cellPolygonOf } from '@axe/domain/tabletop/fog/cell-grid';

export interface OutlineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const EDGE_PROBE_OVERSHOOT = 1.2;

export function moveRangePolygons(grid: CellGrid, cells: CellBits): CellPoint[][] {
  const polygons: CellPoint[][] = [];
  for (let index = 0; index < cells.count; index++) {
    if (cells.get(index)) polygons.push(cellPolygonOf(grid, index));
  }
  return polygons;
}

export function moveRangeOutline(grid: CellGrid, cells: CellBits): OutlineSegment[] {
  const edges: OutlineSegment[] = [];
  if (grid.sizePx <= 0) return edges;

  for (let index = 0; index < cells.count; index++) {
    if (!cells.get(index)) continue;
    const centre = cellCenterOf(grid, index);
    const corners = cellPolygonOf(grid, index);
    for (let corner = 0; corner < corners.length; corner++) {
      const a = corners[corner];
      const b = corners[(corner + 1) % corners.length];
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const beyond = cellIndexAt(
        grid,
        centre.x + (midX - centre.x) * EDGE_PROBE_OVERSHOOT,
        centre.y + (midY - centre.y) * EDGE_PROBE_OVERSHOOT
      );
      if (beyond >= 0 && beyond !== index && cells.get(beyond)) continue;
      edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
  return edges;
}
