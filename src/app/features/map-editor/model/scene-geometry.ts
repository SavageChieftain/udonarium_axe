import { ImageItem, ShapeItem, TextItem } from '@axe/features/map-editor/model/scene';

export interface BoardPoint {
  x: number;
  y: number;
}

export interface MarkBox extends BoardPoint {
  w: number;
  h: number;
}

export function imageBox(item: ImageItem): MarkBox {
  return { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h };
}

export function strokeBox(points: readonly number[]): MarkBox | null {
  if (points.length < 2) return null;
  let left = points[0];
  let right = points[0];
  let top = points[1];
  let bottom = points[1];
  for (let i = 0; i + 1 < points.length; i += 2) {
    left = Math.min(left, points[i]);
    right = Math.max(right, points[i]);
    top = Math.min(top, points[i + 1]);
    bottom = Math.max(bottom, points[i + 1]);
  }
  return { x: left, y: top, w: right - left, h: bottom - top };
}

export function shapeBox(item: ShapeItem): MarkBox | null {
  if (item.shape === 'rect' || item.shape === 'ellipse') {
    const [x = 0, y = 0, w = 0, h = 0] = item.points;
    return { x: Math.min(x, x + w), y: Math.min(y, y + h), w: Math.abs(w), h: Math.abs(h) };
  }
  return strokeBox(item.points);
}

let measureLine: ((text: string, fontSize: number, bold: boolean, italic: boolean) => number) | null = null;

export function useTextMeasurer(measure: typeof measureLine): () => void {
  const was = measureLine;
  measureLine = measure;
  return () => {
    if (measureLine === measure) measureLine = was;
  };
}

export function guessLineWidth(text: string, fontSize: number): number {
  let squares = 0;
  for (const ch of text) squares += isFullWidth(ch) ? 1 : 0.6;
  return squares * fontSize;
}

function isFullWidth(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe6f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6)
  );
}

export function lineWidth(text: string, item: TextItem): number {
  return measureLine ? measureLine(text, item.fontSize, item.bold, item.italic) : guessLineWidth(text, item.fontSize);
}

export function textBox(item: TextItem): MarkBox {
  const lines = item.text.split('\n');
  const widest = lines.reduce((most, line) => Math.max(most, lineWidth(line, item)), item.fontSize);
  const pad = (item.background ? item.fontSize * 0.5 : 0) + (item.outline?.width ?? 0);
  const left = item.align === 'center' ? item.x - widest / 2 : item.align === 'right' ? item.x - widest : item.x;
  return {
    x: left - pad,
    y: item.y - pad,
    w: widest + pad * 2,
    h: lines.length * item.fontSize * 1.2 + pad * 2,
  };
}

export function within(at: BoardPoint, box: MarkBox, slack: number): boolean {
  return (
    at.x >= box.x - slack && at.x <= box.x + box.w + slack && at.y >= box.y - slack && at.y <= box.y + box.h + slack
  );
}

export function strokeSlack(width: number): number {
  return Math.max(6, width / 2 + 2);
}

export function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function pointToPolylineDistance(px: number, py: number, points: readonly number[]): number {
  if (points.length < 2) return Infinity;
  if (points.length < 4) return Math.hypot(px - points[0], py - points[1]);
  let best = Infinity;
  for (let i = 0; i + 3 < points.length; i += 2) {
    const d = pointToSegmentDistance(px, py, points[i], points[i + 1], points[i + 2], points[i + 3]);
    if (d < best) best = d;
  }
  return best;
}
