import { canvasToBlobPreferWebP } from '@axe/core/storage/canvas-blob';
import { clamp } from '@axe/core/util/clamp';
import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCircumradius, hexSpacing, isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import {
  computeCoveredCells,
  DEFAULT_MAX_OUTPUT_PX,
} from '@axe/features/tabletop/map-image-grid-adjuster/map-image-crop';

export interface CoveredRegion {
  cols: number;
  rows: number;
  screenX: number;
  screenY: number;
  screenW: number;
  screenH: number;
  imageX: number;
  imageY: number;
  imageW: number;
  imageH: number;
}

const EMPTY_REGION: CoveredRegion = {
  cols: 0,
  rows: 0,
  screenX: 0,
  screenY: 0,
  screenW: 0,
  screenH: 0,
  imageX: 0,
  imageY: 0,
  imageW: 0,
  imageH: 0,
};

function toImageRegion(
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
  tx: number,
  ty: number,
  scale: number,
  imgW: number,
  imgH: number
): Pick<CoveredRegion, 'imageX' | 'imageY' | 'imageW' | 'imageH'> {
  const imageX = clamp((screenX - tx) / scale, 0, imgW) + 0;
  const imageY = clamp((screenY - ty) / scale, 0, imgH) + 0;
  const imageW = Math.min(screenW / scale, imgW - imageX);
  const imageH = Math.min(screenH / scale, imgH - imageY);
  return { imageX, imageY, imageW, imageH };
}

export function computeCoveredRegion(
  gridType: GridType,
  tx: number,
  ty: number,
  scale: number,
  imgW: number,
  imgH: number,
  displayCell: number,
  tolerancePx = 0.75
): CoveredRegion {
  if (!(scale > 0) || !(displayCell > 0) || imgW <= 0 || imgH <= 0) return EMPTY_REGION;
  if (!isHexGrid(gridType)) {
    const c = computeCoveredCells(tx, ty, scale, imgW, imgH, displayCell, tolerancePx);
    if (c.cols < 1 || c.rows < 1) return EMPTY_REGION;
    const screenW = c.cols * displayCell;
    const screenH = c.rows * displayCell;
    return {
      cols: c.cols,
      rows: c.rows,
      screenX: c.screenX,
      screenY: c.screenY,
      screenW,
      screenH,
      ...toImageRegion(c.screenX, c.screenY, screenW, screenH, tx, ty, scale, imgW, imgH),
    };
  }

  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { colSpacing, rowSpacing } = hexSpacing(displayCell, flat);
  const W = imgW * scale;
  const H = imgH * scale;

  if (flat) {
    let i = Math.ceil((tx - tolerancePx + s3) / colSpacing);
    if (i % 2 !== 0) i += 1;
    const screenX = i * colSpacing - s3;
    const cols = Math.floor((tx + W + tolerancePx - screenX - 2 * s3) / colSpacing) + 1;
    if (cols < 1) return EMPTY_REGION;
    const j = Math.ceil((ty - tolerancePx + displayCell / 2) / rowSpacing);
    const screenY = j * rowSpacing - displayCell / 2;
    const stagger = cols >= 2 ? displayCell / 2 : 0;
    const rows = Math.floor((ty + H + tolerancePx - screenY - stagger) / displayCell);
    if (rows < 1) return EMPTY_REGION;
    const screenW = 2 * s3 + (cols - 1) * colSpacing;
    const screenH = rows * displayCell + stagger;
    return {
      cols,
      rows,
      screenX: screenX + 0,
      screenY: screenY + 0,
      screenW,
      screenH,
      ...toImageRegion(screenX, screenY, screenW, screenH, tx, ty, scale, imgW, imgH),
    };
  }

  let j = Math.ceil((ty - tolerancePx + s3) / rowSpacing);
  if (j % 2 !== 0) j += 1;
  const screenY = j * rowSpacing - s3;
  const rows = Math.floor((ty + H + tolerancePx - screenY - 2 * s3) / rowSpacing) + 1;
  if (rows < 1) return EMPTY_REGION;
  const i = Math.ceil((tx - tolerancePx + displayCell / 2) / colSpacing);
  const screenX = i * colSpacing - displayCell / 2;
  const stagger = rows >= 2 ? displayCell / 2 : 0;
  const cols = Math.floor((tx + W + tolerancePx - screenX - stagger) / displayCell);
  if (cols < 1) return EMPTY_REGION;
  const screenW = cols * displayCell + stagger;
  const screenH = 2 * s3 + (rows - 1) * rowSpacing;
  return {
    cols,
    rows,
    screenX: screenX + 0,
    screenY: screenY + 0,
    screenW,
    screenH,
    ...toImageRegion(screenX, screenY, screenW, screenH, tx, ty, scale, imgW, imgH),
  };
}

export function snapAnchor(
  gridType: GridType,
  tx: number,
  ty: number,
  displayCell: number
): { tx: number; ty: number } {
  if (!(displayCell > 0)) return { tx, ty };
  if (!isHexGrid(gridType)) {
    return {
      tx: Math.round(tx / displayCell) * displayCell,
      ty: Math.round(ty / displayCell) * displayCell,
    };
  }
  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { colSpacing, rowSpacing } = hexSpacing(displayCell, flat);
  if (flat) {
    const i = 2 * Math.round((tx + s3) / colSpacing / 2);
    const j = Math.round((ty + displayCell / 2) / rowSpacing);
    return { tx: i * colSpacing - s3, ty: j * rowSpacing - displayCell / 2 };
  }
  const j = 2 * Math.round((ty + s3) / rowSpacing / 2);
  const i = Math.round((tx + displayCell / 2) / colSpacing);
  return { tx: i * colSpacing - displayCell / 2, ty: j * rowSpacing - s3 };
}

export function footprintSize(
  gridType: GridType,
  cols: number,
  rows: number,
  displayCell: number
): { w: number; h: number } {
  if (!(cols >= 1) || !(rows >= 1) || !(displayCell > 0)) return { w: 0, h: 0 };
  if (!isHexGrid(gridType)) return { w: cols * displayCell, h: rows * displayCell };
  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { colSpacing, rowSpacing } = hexSpacing(displayCell, flat);
  if (flat) {
    return {
      w: 2 * s3 + (cols - 1) * colSpacing,
      h: rows * displayCell + (cols >= 2 ? displayCell / 2 : 0),
    };
  }
  return {
    w: cols * displayCell + (rows >= 2 ? displayCell / 2 : 0),
    h: 2 * s3 + (rows - 1) * rowSpacing,
  };
}

export function colsForWidth(gridType: GridType, width: number, displayCell: number): number {
  if (!(width > 0) || !(displayCell > 0)) return 1;
  if (!isHexGrid(gridType)) return Math.max(1, Math.round(width / displayCell));
  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { colSpacing } = hexSpacing(displayCell, flat);
  if (flat) return Math.max(1, Math.round((width - 2 * s3) / colSpacing) + 1);
  return Math.max(1, Math.round((width - displayCell / 2) / displayCell));
}

export function rowsForHeight(gridType: GridType, height: number, displayCell: number): number {
  if (!(height > 0) || !(displayCell > 0)) return 1;
  if (!isHexGrid(gridType)) return Math.max(1, Math.round(height / displayCell));
  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { rowSpacing } = hexSpacing(displayCell, flat);
  if (flat) return Math.max(1, Math.round((height - displayCell / 2) / displayCell));
  return Math.max(1, Math.round((height - 2 * s3) / rowSpacing) + 1);
}

export function coversFrame(
  tx: number,
  ty: number,
  imageScreenW: number,
  imageScreenH: number,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  tolerancePx = 0.75
): boolean {
  return (
    tx <= frameX + tolerancePx &&
    ty <= frameY + tolerancePx &&
    tx + imageScreenW >= frameX + frameW - tolerancePx &&
    ty + imageScreenH >= frameY + frameH - tolerancePx
  );
}

export function scaleForCols(gridType: GridType, cols: number, imgW: number, displayCell: number): number {
  if (!(cols >= 1) || !(imgW > 0) || !(displayCell > 0)) return 0;
  if (!isHexGrid(gridType)) return (cols * displayCell) / imgW;
  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { colSpacing } = hexSpacing(displayCell, flat);
  if (flat) return (2 * s3 + (cols - 1) * colSpacing) / imgW;
  return (cols * displayCell + displayCell / 2) / imgW;
}

export function scaleForRows(gridType: GridType, rows: number, imgH: number, displayCell: number): number {
  if (!(rows >= 1) || !(imgH > 0) || !(displayCell > 0)) return 0;
  if (!isHexGrid(gridType)) return (rows * displayCell) / imgH;
  const flat = isFlatTopGrid(gridType);
  const s3 = hexCircumradius(displayCell);
  const { rowSpacing } = hexSpacing(displayCell, flat);
  if (flat) return (rows * displayCell + displayCell / 2) / imgH;
  return (2 * s3 + (rows - 1) * rowSpacing) / imgH;
}

export async function cropImageRegion(
  image: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  maxOutputPx = DEFAULT_MAX_OUTPUT_PX
): Promise<Blob> {
  if (!(sw > 0) || !(sh > 0)) throw new Error('invalid crop region');
  const longest = Math.max(sw, sh);
  const outScale = longest > maxOutputPx ? maxOutputPx / longest : 1;
  const outputW = Math.max(1, Math.round(sw * outScale));
  const outputH = Math.max(1, Math.round(sh * outScale));
  if (typeof document === 'undefined') throw new Error('canvas unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputW, outputH);
  const blob = await canvasToBlobPreferWebP(canvas, 0.92);
  if (!blob) throw new Error('canvas toBlob unavailable');
  return blob;
}
