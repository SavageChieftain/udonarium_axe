import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCellCenter, hexSpacing, isFlatTopGrid, isHexGrid, pixelToHexCell } from '@axe/domain/tabletop/hex-geometry';

function flatTopNeighbors(col: number, row: number): [number, number][] {
  const odd = Math.abs(col % 2) === 1;
  const dy = odd ? 0 : -1;
  return [
    [col, row - 1],
    [col, row + 1],
    [col - 1, row + dy],
    [col - 1, row + dy + 1],
    [col + 1, row + dy],
    [col + 1, row + dy + 1],
  ];
}

function pointyTopNeighbors(col: number, row: number): [number, number][] {
  const odd = Math.abs(row % 2) === 1;
  const dx = odd ? 0 : -1;
  return [
    [col - 1, row],
    [col + 1, row],
    [col + dx, row - 1],
    [col + dx + 1, row - 1],
    [col + dx, row + 1],
    [col + dx + 1, row + 1],
  ];
}

export function cellNeighbors(gridType: GridType, col: number, row: number): [number, number][] {
  if (gridType === GridType.HEX_VERTICAL) return flatTopNeighbors(col, row);
  if (gridType === GridType.HEX_HORIZONTAL) return pointyTopNeighbors(col, row);
  return [
    [col - 1, row],
    [col + 1, row],
    [col, row - 1],
    [col, row + 1],
  ];
}

export function pointToCell(gridType: GridType, x: number, y: number, cellPx: number): { col: number; row: number } {
  if (isHexGrid(gridType)) {
    return pixelToHexCell(x, y, cellPx, isFlatTopGrid(gridType));
  }
  return { col: Math.floor(x / cellPx), row: Math.floor(y / cellPx) };
}

export function cellCenter(gridType: GridType, col: number, row: number, cellPx: number): { x: number; y: number } {
  if (isHexGrid(gridType)) {
    const flatTop = isFlatTopGrid(gridType);
    const { colSpacing, rowSpacing } = hexSpacing(cellPx, flatTop);
    return hexCellCenter(col, row, colSpacing, rowSpacing, flatTop);
  }
  return { x: (col + 0.5) * cellPx, y: (row + 0.5) * cellPx };
}
