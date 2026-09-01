import { GridType } from '@axe/domain/tabletop/game-table';
import {
  hexCircumradius,
  hexSpacing,
  hexStartAngle,
  hexVertices,
  isFlatTopGrid,
  isHexGrid,
  pixelToHexCell,
} from '@axe/domain/tabletop/hex-geometry';
import { cellCentre, MapGrid } from '@axe/domain/tabletop/map-grid';

export interface CellGrid extends MapGrid {
  cols: number;
  rows: number;
}

export interface CellPoint {
  x: number;
  y: number;
}

export function cellGridOf(cols: number, rows: number, gridSize: number, gridType: GridType): CellGrid {
  return { cols: Math.max(0, Math.floor(cols)), rows: Math.max(0, Math.floor(rows)), sizePx: gridSize, type: gridType };
}

export function cellCount(grid: CellGrid): number {
  return grid.cols * grid.rows;
}

export function sameCellGrid(a: CellGrid, b: CellGrid): boolean {
  return a.cols === b.cols && a.rows === b.rows && a.type === b.type;
}

export function cellIndexOf(grid: CellGrid, col: number, row: number): number {
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return -1;
  return row * grid.cols + col;
}

export function cellColRow(grid: CellGrid, index: number): { col: number; row: number } {
  return { col: index % grid.cols, row: Math.floor(index / grid.cols) };
}

export function cellCenterOf(grid: CellGrid, index: number): CellPoint {
  const { col, row } = cellColRow(grid, index);
  return cellCentre({ x: col, y: row }, grid);
}

export function cellIndexAt(grid: CellGrid, x: number, y: number): number {
  if (grid.sizePx <= 0) return -1;
  if (!isHexGrid(grid.type)) {
    return cellIndexOf(grid, Math.floor(x / grid.sizePx), Math.floor(y / grid.sizePx));
  }
  const { col, row } = pixelToHexCell(x, y, grid.sizePx, isFlatTopGrid(grid.type));
  return cellIndexOf(grid, col, row);
}

export function cellPolygonOf(grid: CellGrid, index: number): CellPoint[] {
  const centre = cellCenterOf(grid, index);
  if (!isHexGrid(grid.type)) {
    const half = grid.sizePx / 2;
    return [
      { x: centre.x - half, y: centre.y - half },
      { x: centre.x + half, y: centre.y - half },
      { x: centre.x + half, y: centre.y + half },
      { x: centre.x - half, y: centre.y + half },
    ];
  }
  const flatTop = isFlatTopGrid(grid.type);
  return hexVertices(centre.x, centre.y, hexCircumradius(grid.sizePx), hexStartAngle(flatTop));
}

export function gridExtentPx(grid: CellGrid): { minX: number; minY: number; maxX: number; maxY: number } {
  if (!isHexGrid(grid.type)) {
    return { minX: 0, minY: 0, maxX: grid.cols * grid.sizePx, maxY: grid.rows * grid.sizePx };
  }
  const flatTop = isFlatTopGrid(grid.type);
  const { colSpacing, rowSpacing } = hexSpacing(grid.sizePx, flatTop);
  const s = hexCircumradius(grid.sizePx);
  return {
    minX: -s,
    minY: -s,
    maxX: colSpacing * grid.cols + s,
    maxY: rowSpacing * grid.rows + s,
  };
}

export function forEachCell(grid: CellGrid, visit: (index: number, cx: number, cy: number) => void): void {
  if (grid.sizePx <= 0) return;
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const centre = cellCentre({ x: col, y: row }, grid);
      visit(row * grid.cols + col, centre.x, centre.y);
    }
  }
}

export function forEachCellInBox(
  grid: CellGrid,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  visit: (index: number, cx: number, cy: number) => void
): void {
  if (grid.sizePx <= 0 || grid.cols <= 0 || grid.rows <= 0) return;
  const extent = gridExtentPx(grid);
  const lowX = Math.max(minX, extent.minX);
  const lowY = Math.max(minY, extent.minY);
  const highX = Math.min(maxX, extent.maxX);
  const highY = Math.min(maxY, extent.maxY);
  if (lowX > highX || lowY > highY) return;
  const bounds = boxToCellBounds(grid, lowX, lowY, highX, highY);
  for (let row = bounds.fromRow; row <= bounds.toRow; row++) {
    for (let col = bounds.fromCol; col <= bounds.toCol; col++) {
      const index = row * grid.cols + col;
      const centre = cellCentre({ x: col, y: row }, grid);
      if (centre.x < minX || centre.x > maxX || centre.y < minY || centre.y > maxY) continue;
      visit(index, centre.x, centre.y);
    }
  }
}

function boxToCellBounds(
  grid: CellGrid,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): { fromCol: number; toCol: number; fromRow: number; toRow: number } {
  const topLeft = looseCellAt(grid, minX, minY);
  const bottomRight = looseCellAt(grid, maxX, maxY);
  return {
    fromCol: Math.max(0, Math.min(topLeft.col, bottomRight.col) - 1),
    toCol: Math.min(grid.cols - 1, Math.max(topLeft.col, bottomRight.col) + 1),
    fromRow: Math.max(0, Math.min(topLeft.row, bottomRight.row) - 1),
    toRow: Math.min(grid.rows - 1, Math.max(topLeft.row, bottomRight.row) + 1),
  };
}

function looseCellAt(grid: CellGrid, x: number, y: number): { col: number; row: number } {
  if (!isHexGrid(grid.type)) {
    return { col: Math.floor(x / grid.sizePx), row: Math.floor(y / grid.sizePx) };
  }
  return pixelToHexCell(x, y, grid.sizePx, isFlatTopGrid(grid.type));
}

const NEIGHBOUR_DIRECTIONS = 8;

/**
 * The cells around one, whatever shape the cells are.
 *
 * Found by looking a cell's width away in eight directions rather than by counting columns,
 * which on a hex board would mean knowing which rows are the shifted ones. A few of the eight
 * land on the same neighbour; they are dropped rather than reckoned with.
 */
export function forEachNeighbourCell(grid: CellGrid, index: number, visit: (neighbour: number) => void): void {
  if (grid.sizePx <= 0) return;
  const centre = cellCenterOf(grid, index);
  let last = -1;
  for (let i = 0; i < NEIGHBOUR_DIRECTIONS; i++) {
    const angle = (i / NEIGHBOUR_DIRECTIONS) * Math.PI * 2;
    const neighbour = cellIndexAt(
      grid,
      centre.x + Math.cos(angle) * grid.sizePx,
      centre.y + Math.sin(angle) * grid.sizePx
    );
    if (neighbour < 0 || neighbour === index || neighbour === last) continue;
    last = neighbour;
    visit(neighbour);
  }
}
