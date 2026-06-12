import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCircumradius, hexStartAngle, isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { cellCenter } from '@axe/features/map-maker/model/grid-cells';
import {
  FillStyle,
  FreehandStroke,
  ImageItem,
  MapScene,
  parseCellKey,
  sceneHeightPx,
  sceneWidthPx,
  ShapeItem,
  StampItem,
  StrokeStyle,
  TextItem,
  WallSegment,
} from '@axe/features/map-maker/model/scene';

export interface RenderHelpers {
  texturePattern(
    fill: { textureId: string; scale: number; rotation: number },
    cellPx: number
  ): CanvasPattern | string | null;
  stampImage(item: StampItem): CanvasImageSource | null;
  rasterImage?(item: ImageItem): CanvasImageSource | null;
}

export interface RenderOptions {
  drawGrid?: boolean;
}

function applyPatternTransform(pattern: CanvasPattern, scale: number, rotation: number): void {
  if (typeof DOMMatrix === 'undefined' || typeof pattern.setTransform !== 'function') return;
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const safeRotation = Number.isFinite(rotation) ? rotation : 0;
  pattern.setTransform(new DOMMatrix().rotate(safeRotation).scale(safeScale));
}

function resolveFill(fill: FillStyle, helpers: RenderHelpers, cellPx: number): string | CanvasPattern | null {
  if (fill.type === 'solid') return fill.color;
  const resolved = helpers.texturePattern(
    { textureId: fill.textureId, scale: fill.scale, rotation: fill.rotation },
    cellPx
  );
  if (resolved && typeof resolved !== 'string') {
    applyPatternTransform(resolved, fill.scale, fill.rotation);
  }
  return resolved;
}

function applyStroke(ctx: CanvasRenderingContext2D, stroke: StrokeStyle): void {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
}

function bboxCenter(item: ShapeItem): { cx: number; cy: number } {
  const p = item.points;
  if (item.shape === 'rect' || item.shape === 'ellipse') {
    return { cx: (p[0] ?? 0) + (p[2] ?? 0) / 2, cy: (p[1] ?? 0) + (p[3] ?? 0) / 2 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < p.length; i += 2) {
    const x = p[i];
    const y = p[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return { cx: 0, cy: 0 };
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function pathShape(ctx: CanvasRenderingContext2D, item: ShapeItem): void {
  const p = item.points;
  if (item.shape === 'rect') {
    ctx.beginPath();
    ctx.rect(p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] ?? 0);
    return;
  }
  if (item.shape === 'ellipse') {
    const w = p[2] ?? 0;
    const h = p[3] ?? 0;
    ctx.beginPath();
    ctx.ellipse((p[0] ?? 0) + w / 2, (p[1] ?? 0) + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    return;
  }
  ctx.beginPath();
  if (p.length >= 2) {
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i + 1 < p.length; i += 2) {
      ctx.lineTo(p[i], p[i + 1]);
    }
    if (item.shape === 'polygon') ctx.closePath();
  }
}

function drawShapeItem(ctx: CanvasRenderingContext2D, item: ShapeItem, helpers: RenderHelpers, cellPx: number): void {
  const { cx, cy } = bboxCenter(item);
  ctx.save();
  if (item.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }
  pathShape(ctx, item);
  if (item.fill && item.shape !== 'line') {
    const fill = resolveFill(item.fill, helpers, cellPx);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }
  if (item.stroke) {
    applyStroke(ctx, item.stroke);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();
}

function drawWallSegment(ctx: CanvasRenderingContext2D, segment: WallSegment): void {
  const p = segment.points;
  if (p.length < 4) return;
  ctx.save();
  ctx.strokeStyle = segment.color;
  ctx.lineWidth = segment.thickness;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  for (let i = 2; i + 1 < p.length; i += 2) {
    ctx.lineTo(p[i], p[i + 1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawStamp(ctx: CanvasRenderingContext2D, item: StampItem, helpers: RenderHelpers): void {
  const image = helpers.stampImage(item);
  if (!image) return;
  ctx.save();
  ctx.translate(item.x, item.y);
  if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
  const half = item.size / 2;
  ctx.drawImage(image, -half, -half, item.size, item.size);
  ctx.restore();
}

function drawImageItem(
  ctx: CanvasRenderingContext2D,
  item: ImageItem,
  helpers: RenderHelpers,
  layerAlpha: number
): void {
  const image = helpers.rasterImage?.(item);
  if (!image) return;
  ctx.save();
  ctx.globalAlpha = layerAlpha * (Number.isFinite(item.opacity) ? Math.max(0, Math.min(1, item.opacity)) : 1);
  ctx.translate(item.x, item.y);
  if (item.rotation) ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.drawImage(image, -item.w / 2, -item.h / 2, item.w, item.h);
  ctx.restore();
}

function fillHexCell(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, startAngle: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = startAngle + (i * Math.PI) / 3;
    const x = cx + s * Math.cos(angle);
    const y = cy + s * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function strokeHexCell(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, startAngle: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = startAngle + (i * Math.PI) / 3;
    const x = cx + s * Math.cos(angle);
    const y = cy + s * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawFreehandStroke(ctx: CanvasRenderingContext2D, stroke: FreehandStroke): void {
  const p = stroke.points;
  if (p.length < 2) return;
  ctx.save();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  if (p.length === 4) {
    ctx.lineTo(p[2], p[3]);
  } else {
    for (let i = 2; i + 3 < p.length; i += 2) {
      const midX = (p[i] + p[i + 2]) / 2;
      const midY = (p[i + 1] + p[i + 3]) / 2;
      ctx.quadraticCurveTo(p[i], p[i + 1], midX, midY);
    }
    ctx.lineTo(p[p.length - 2], p[p.length - 1]);
  }
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, item: TextItem): void {
  ctx.save();
  const parts: string[] = [];
  if (item.italic) parts.push('italic');
  if (item.bold) parts.push('bold');
  parts.push(`${item.fontSize}px`, 'sans-serif');
  ctx.font = parts.join(' ');
  ctx.textAlign = item.align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = item.color;
  const lines = item.text.split('\n');
  const lineHeight = item.fontSize * 1.2;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], item.x, item.y + i * lineHeight);
  }
  ctx.restore();
}

function drawHexGridLines(ctx: CanvasRenderingContext2D, scene: MapScene): void {
  ctx.save();
  ctx.strokeStyle = scene.gridColor;
  ctx.lineWidth = 1;
  const s = hexCircumradius(scene.cellPx);
  const startAngle = hexStartAngle(isFlatTopGrid(scene.gridType));
  for (let col = 0; col < scene.cols; col += 1) {
    for (let row = 0; row < scene.rows; row += 1) {
      const { x, y } = cellCenter(scene.gridType, col, row, scene.cellPx);
      strokeHexCell(ctx, x, y, s, startAngle);
    }
  }
  ctx.restore();
}

function drawGridLines(ctx: CanvasRenderingContext2D, scene: MapScene, width: number, height: number): void {
  if (isHexGrid(scene.gridType)) {
    drawHexGridLines(ctx, scene);
    return;
  }
  if (scene.gridType === GridType.NONE) return;
  ctx.save();
  ctx.strokeStyle = scene.gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= scene.cols; c += 1) {
    const x = c * scene.cellPx + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let r = 0; r <= scene.rows; r += 1) {
    const y = r * scene.cellPx + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.restore();
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  helpers: RenderHelpers,
  options?: RenderOptions
): void {
  if (!ctx) return;
  const width = sceneWidthPx(scene);
  const height = sceneHeightPx(scene);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, width, height);

  for (const layer of scene.layers) {
    if (!layer.visible) continue;
    ctx.globalAlpha = layer.opacity;
    switch (layer.kind) {
      case 'cell': {
        const hex = isHexGrid(scene.gridType);
        const s = hex ? hexCircumradius(scene.cellPx) : 0;
        const startAngle = hex ? hexStartAngle(isFlatTopGrid(scene.gridType)) : 0;
        for (const [key, fill] of Object.entries(layer.cells)) {
          const resolved = resolveFill(fill, helpers, scene.cellPx);
          if (!resolved) continue;
          const { col, row } = parseCellKey(key);
          ctx.fillStyle = resolved;
          if (hex) {
            const { x, y } = cellCenter(scene.gridType, col, row, scene.cellPx);
            fillHexCell(ctx, x, y, s, startAngle);
          } else {
            ctx.fillRect(col * scene.cellPx, row * scene.cellPx, scene.cellPx, scene.cellPx);
          }
        }
        break;
      }
      case 'shape':
        for (const item of layer.items) drawShapeItem(ctx, item, helpers, scene.cellPx);
        break;
      case 'wall':
        for (const segment of layer.segments) drawWallSegment(ctx, segment);
        break;
      case 'stamp':
        for (const item of layer.items) drawStamp(ctx, item, helpers);
        break;
      case 'freehand':
        for (const stroke of layer.strokes) drawFreehandStroke(ctx, stroke);
        break;
      case 'text':
        for (const item of layer.items) drawText(ctx, item);
        break;
      case 'image':
        for (const item of layer.items) drawImageItem(ctx, item, helpers, layer.opacity);
        break;
    }
  }

  ctx.globalAlpha = 1;

  if (options?.drawGrid ?? scene.gridVisible) {
    drawGridLines(ctx, scene, width, height);
  }
}
