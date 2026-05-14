/**
 * ヘクスグリッドの共通ジオメトリプリミティブ。
 *
 * 用語:
 *   circumradius (s) — ヘクス中心から頂点までの距離 = gridSize / √3
 *   gridSize         — ヘクスの辺間距離 (inradius × 2) = √3 × s
 *   flat-top         — GridType.HEX_VERTICAL: 列が縦に直線
 *   pointy-top       — GridType.HEX_HORIZONTAL: 行が横に直線
 */

import { GridType } from '@axe/domain/tabletop/game-table';

export function hexCircumradius(gridSize: number): number {
  return gridSize / Math.sqrt(3);
}

export function isFlatTopGrid(gridType: GridType): boolean {
  return gridType === GridType.HEX_VERTICAL;
}

export function isHexGrid(gridType: GridType): boolean {
  return gridType === GridType.HEX_VERTICAL || gridType === GridType.HEX_HORIZONTAL;
}

export interface HexSpacing {
  colSpacing: number;
  rowSpacing: number;
}

export function hexSpacing(gridSize: number, isFlatTop: boolean): HexSpacing {
  const s = hexCircumradius(gridSize);
  return isFlatTop ? { colSpacing: 1.5 * s, rowSpacing: gridSize } : { colSpacing: gridSize, rowSpacing: 1.5 * s };
}

/** flat-top → 0、pointy-top → -π/2。 */
export function hexStartAngle(isFlatTop: boolean): number {
  return isFlatTop ? 0 : -Math.PI / 2;
}

/** col/row はタイリングインデックス (キューブ座標ではない)。 */
export function hexCellCenter(
  col: number,
  row: number,
  colSpacing: number,
  rowSpacing: number,
  isFlatTop: boolean
): { x: number; y: number } {
  if (isFlatTop) {
    return {
      x: col * colSpacing,
      y: row * rowSpacing + (Math.abs(col % 2) === 1 ? rowSpacing / 2 : 0),
    };
  }
  return {
    x: col * colSpacing + (Math.abs(row % 2) === 1 ? colSpacing / 2 : 0),
    y: row * rowSpacing,
  };
}

/** 頂点は CW (時計回り) で返す。 */
export function hexVertices(cx: number, cy: number, s: number, startAngle: number): { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    verts.push({ x: cx + s * Math.cos(angle), y: cy + s * Math.sin(angle) });
  }
  return verts;
}

/** 近傍セル中心の全探索で最近接 (col, row) を返す。 */
export function pixelToHexCell(
  px: number,
  py: number,
  gridSize: number,
  isFlatTop: boolean
): { col: number; row: number } {
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);
  const colEst = px / colSpacing;
  const rowEst = py / rowSpacing;
  let bestCol = 0;
  let bestRow = 0;
  let bestDist = Infinity;
  for (let col = Math.floor(colEst) - 1; col <= Math.ceil(colEst) + 1; col++) {
    for (let row = Math.floor(rowEst) - 1; row <= Math.ceil(rowEst) + 1; row++) {
      const { x, y } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);
      const dx = px - x;
      const dy = py - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = col;
        bestRow = row;
      }
    }
  }
  return { col: bestCol, row: bestRow };
}

export function strokeHexPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  startAngle: number
): void {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    const x = cx + s * Math.cos(angle);
    const y = cy + s * Math.sin(angle);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.stroke();
}

export function fillHexPath(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  startAngle: number
): void {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    const x = cx + s * Math.cos(angle);
    const y = cy + s * Math.sin(angle);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}
