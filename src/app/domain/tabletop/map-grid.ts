import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCellCenter, hexSpacing, isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { MapPoint, MapRect, MapSize } from '@axe/domain/tabletop/map-blocks';

/** The board a generated map is laid out on: what shape its cells are and how big they are. */
export interface MapGrid {
  type: GridType;
  sizePx: number;
}

/**
 * How many cells may be gathered into one block.
 *
 * On squares, a run of cells is a rectangle and one block can stand for a great many of them,
 * which is most of what keeps a generated map affordable. Hexes do not tile into rectangles,
 * so a block that stood for several would sit across the grid rather than on it: on a hex
 * board every cell is its own block, and the board is made smaller to pay for it.
 */
export function mergeSpanFor(grid: MapGrid, span: number): number {
  return isHexGrid(grid.type) ? 1 : span;
}

/** Where a block goes, in table pixels: its top left corner. */
export function blockOrigin(rect: MapRect, grid: MapGrid): MapPoint {
  if (!isHexGrid(grid.type)) return { x: rect.x * grid.sizePx, y: rect.y * grid.sizePx };
  const middle = cellCentre({ x: rect.x, y: rect.y }, grid);
  return { x: middle.x - grid.sizePx / 2, y: middle.y - grid.sizePx / 2 };
}

/** The middle of a cell, which is where anything that stands on one rather than over it goes. */
export function cellCentre(cell: MapPoint, grid: MapGrid): MapPoint {
  if (!isHexGrid(grid.type)) {
    return { x: (cell.x + 0.5) * grid.sizePx, y: (cell.y + 0.5) * grid.sizePx };
  }
  const flatTop = isFlatTopGrid(grid.type);
  const { colSpacing, rowSpacing } = hexSpacing(grid.sizePx, flatTop);
  return hexCellCenter(cell.x, cell.y, colSpacing, rowSpacing, flatTop);
}

/**
 * How much smaller a hex board is made than the square board asked for.
 *
 * Every cell of a hex board is its own block, where a square board gathers a dozen into one,
 * so the same board would cost more terrain than a table can carry. A quarter off each side
 * takes nearly half the area, which measured across every mood, room count and a spread of
 * seeds brings the worst of them to about four fifths of what the table will take.
 */
export const HEX_BOARD_FACTOR = 0.75;

export function boardSizeOn(size: MapSize, grid: MapGrid): MapSize {
  if (!isHexGrid(grid.type)) return size;
  return {
    width: Math.max(4, Math.round(size.width * HEX_BOARD_FACTOR)),
    height: Math.max(4, Math.round(size.height * HEX_BOARD_FACTOR)),
  };
}
