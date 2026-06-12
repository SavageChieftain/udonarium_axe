export interface GridCounts {
  cols: number;
  rows: number;
}

export interface CropAlignedRegionOptions {
  cellPx: number;
  offsetX: number;
  offsetY: number;
  cols: number;
  rows: number;
  maxOutputPx?: number;
}

export const DEFAULT_MAX_OUTPUT_PX = 4096;

const COUNT_EPSILON = 1e-7;

export function effectiveOrigin(offset: number, cellPx: number): number {
  if (!(cellPx > 0)) return 0;
  if (offset >= 0) return offset;
  return ((offset % cellPx) + cellPx) % cellPx;
}

export function computeGridCounts(
  imageW: number,
  imageH: number,
  cellPx: number,
  offsetX: number,
  offsetY: number
): GridCounts {
  if (!(cellPx > 0)) return { cols: 0, rows: 0 };
  const startX = effectiveOrigin(offsetX, cellPx);
  const startY = effectiveOrigin(offsetY, cellPx);
  const cols = Math.max(0, Math.floor((imageW - startX) / cellPx + COUNT_EPSILON));
  const rows = Math.max(0, Math.floor((imageH - startY) / cellPx + COUNT_EPSILON));
  return { cols, rows };
}

export function clampOffset(offset: number, cellPx: number, imageSize: number): number {
  if (!(cellPx > 0)) return 0;
  const min = -(cellPx - 1);
  const max = Math.max(0, imageSize - 1);
  return Math.min(max, Math.max(min, offset));
}

export async function cropAlignedRegion(
  image: CanvasImageSource,
  imageW: number,
  imageH: number,
  opts: CropAlignedRegionOptions
): Promise<Blob> {
  const { cellPx, offsetX, offsetY, cols, rows } = opts;
  const maxOutputPx = opts.maxOutputPx ?? DEFAULT_MAX_OUTPUT_PX;

  if (!(cellPx > 0) || cols < 1 || rows < 1) {
    throw new Error('invalid crop region');
  }

  const regionW = cols * cellPx;
  const regionH = rows * cellPx;

  const longest = Math.max(regionW, regionH);
  const scale = longest > maxOutputPx ? maxOutputPx / longest : 1;
  const outputW = Math.max(1, Math.round(regionW * scale));
  const outputH = Math.max(1, Math.round(regionH * scale));

  if (typeof document === 'undefined') throw new Error('canvas unavailable');
  const canvas = document.createElement('canvas');
  canvas.width = outputW;
  canvas.height = outputH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas context unavailable');

  ctx.drawImage(image, offsetX, offsetY, regionW, regionH, 0, 0, outputW, outputH);

  const blob = await canvasToBlobPreferWebP(canvas, 0.92);
  if (!blob) throw new Error('canvas toBlob unavailable');
  return blob;
}

async function canvasToBlobPreferWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  return canvasToBlob(canvas, 'image/png', quality);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
