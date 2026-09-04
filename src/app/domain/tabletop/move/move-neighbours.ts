import { cellColRow, CellGrid, cellIndexOf } from '@axe/domain/tabletop/fog/cell-grid';
import { GridType } from '@axe/domain/tabletop/game-table';
import { isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';

export const DIAGONAL_COSTS_ONE_CELL: boolean = true;

type Step = readonly [number, number];

const ORTHOGONAL_STEPS: readonly Step[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

const DIAGONAL_STEPS: readonly Step[] = [
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];

const SQUARE_STEPS: readonly Step[] = DIAGONAL_COSTS_ONE_CELL
  ? [...ORTHOGONAL_STEPS, ...DIAGONAL_STEPS]
  : ORTHOGONAL_STEPS;

const FLAT_TOP_EVEN_COLUMN_STEPS: readonly Step[] = [
  [0, -1],
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [-1, -1],
];

const FLAT_TOP_ODD_COLUMN_STEPS: readonly Step[] = [
  [0, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

const POINTY_TOP_EVEN_ROW_STEPS: readonly Step[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

const POINTY_TOP_ODD_ROW_STEPS: readonly Step[] = [
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 0],
  [0, -1],
];

function stepsFor(gridType: GridType, col: number, row: number): readonly Step[] {
  if (!isHexGrid(gridType)) return SQUARE_STEPS;
  if (isFlatTopGrid(gridType)) {
    return Math.abs(col % 2) === 1 ? FLAT_TOP_ODD_COLUMN_STEPS : FLAT_TOP_EVEN_COLUMN_STEPS;
  }
  return Math.abs(row % 2) === 1 ? POINTY_TOP_ODD_ROW_STEPS : POINTY_TOP_EVEN_ROW_STEPS;
}

export function forEachMoveNeighbour(grid: CellGrid, index: number, visit: (neighbour: number) => void): void {
  if (grid.cols <= 0 || grid.rows <= 0) return;
  if (index < 0 || index >= grid.cols * grid.rows) return;
  const { col, row } = cellColRow(grid, index);
  for (const [dx, dy] of stepsFor(grid.type, col, row)) {
    const neighbour = cellIndexOf(grid, col + dx, row + dy);
    if (neighbour >= 0) visit(neighbour);
  }
}

export function moveNeighboursOf(grid: CellGrid, index: number): number[] {
  const found: number[] = [];
  forEachMoveNeighbour(grid, index, (neighbour) => found.push(neighbour));
  return found;
}
