import { GridType } from '@axe/domain/tabletop/game-table';
import {
  createLayer,
  createScene,
  FreehandLayer,
  ImageItem,
  ImageLayer,
  MapLayer,
  MapScene,
  newId,
  ShapeItem,
  ShapeLayer,
  TextItem,
  TextLayer,
} from '@axe/features/map-editor/model/scene';
import { eraseStrokeAtPoint } from '@axe/features/map-editor/model/scene-ops';

/**
 * What a board can be marked with.
 *
 * A board is not a map: nothing is painted cell by cell on one, and it has no grid to paint
 * on. What it has is a pen, a straight edge, a few shapes, words, and whatever is stuck to
 * it, which is why it has an editor of its own rather than the one that draws maps.
 */
export type BoardTool = 'select' | 'pen' | 'eraser' | 'line' | 'box' | 'ellipse' | 'text' | 'sticker';

export const BOARD_TOOLS: readonly BoardTool[] = [
  'select',
  'pen',
  'eraser',
  'line',
  'box',
  'ellipse',
  'text',
  'sticker',
];

/**
 * The sheet a new mark goes on.
 *
 * The one the reader is working on, if it takes marks of this sort and is not locked; the
 * topmost that does otherwise; and a fresh one on top if none does. A board with sheets is
 * what lets the plan be drawn once and the arrows over it rubbed out and drawn again.
 */
export function layerFor(scene: MapScene, kind: MapLayer['kind'], activeId?: string | null): MapLayer {
  const active = scene.layers.find((layer) => layer.id === activeId);
  if (active && active.kind === kind && !active.locked) return active;

  for (let i = scene.layers.length - 1; i >= 0; i--) {
    const layer = scene.layers[i];
    if (layer.kind === kind && !layer.locked) return layer;
  }

  const made = createLayer(kind, kind);
  scene.layers.push(made);
  return made;
}

export function freehandLayer(scene: MapScene, activeId?: string | null): FreehandLayer {
  return layerFor(scene, 'freehand', activeId) as FreehandLayer;
}

export function shapeLayer(scene: MapScene, activeId?: string | null): ShapeLayer {
  return layerFor(scene, 'shape', activeId) as ShapeLayer;
}

export function textLayer(scene: MapScene, activeId?: string | null): TextLayer {
  return layerFor(scene, 'text', activeId) as TextLayer;
}

export function imageLayer(scene: MapScene, activeId?: string | null): ImageLayer {
  return layerFor(scene, 'image', activeId) as ImageLayer;
}

/** The spacings a board can be ruled at, in the board's own pixels. */
export const GRAPH_SPACINGS: readonly number[] = [50, 25, 10];

/**
 * Rules the board at a chosen spacing without changing how big the board is.
 *
 * How wide the sheet is comes out of how many cells it has and how big each one is, so ruling
 * it more finely has to buy back the size in cells or the sheet shrinks under the drawing.
 */
export function ruleBoard(scene: MapScene, widthPx: number, heightPx: number, spacing: number): void {
  scene.cellPx = spacing;
  scene.cols = Math.max(1, Math.round(widthPx / spacing));
  scene.rows = Math.max(1, Math.round(heightPx / spacing));
}

/** A board's own surface: no grid, and nothing painted under what is drawn on it. */
export function createBoardScene(cols: number, rows: number, cellPx: number): MapScene {
  const scene = createScene(cols, rows, cellPx, GridType.SQUARE);
  scene.gridVisible = false;
  scene.background = 'transparent';
  return scene;
}

export interface MarkStyle {
  color: string;
  width: number;
  fontSize: number;
}

export function penStroke(points: number[], style: MarkStyle) {
  return { id: newId(), points, color: style.color, width: style.width };
}

export function straightLine(from: BoardPoint, to: BoardPoint, style: MarkStyle): ShapeItem {
  return {
    id: newId(),
    shape: 'line',
    points: [from.x, from.y, to.x, to.y],
    fill: null,
    stroke: { color: style.color, width: style.width, dash: 'solid' },
    rotation: 0,
  };
}

export interface BoardPoint {
  x: number;
  y: number;
}

/** A box or an ellipse is drawn corner to corner, whichever way round it was dragged. */
export function boxBetween(kind: 'box' | 'ellipse', from: BoardPoint, to: BoardPoint, style: MarkStyle): ShapeItem {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  return {
    id: newId(),
    shape: kind === 'box' ? 'rect' : 'ellipse',
    points: [x, y, w, h],
    fill: null,
    stroke: { color: style.color, width: style.width, dash: 'solid' },
    rotation: 0,
  };
}

export function wordsAt(at: BoardPoint, text: string, style: MarkStyle): TextItem {
  return {
    id: newId(),
    x: at.x,
    y: at.y,
    text,
    fontSize: style.fontSize,
    color: style.color,
    bold: false,
    italic: false,
    align: 'left',
  };
}

/** A sticker goes down where it was put, at a size that reads on the board it is stuck to. */
export function stickerAt(at: BoardPoint, imageIdentifier: string, size: number): ImageItem {
  return {
    id: newId(),
    imageIdentifier,
    x: at.x - size / 2,
    y: at.y - size / 2,
    w: size,
    h: size,
    rotation: 0,
    opacity: 1,
  };
}

/**
 * Rubs out what the eraser passed over, and leaves the rest of the stroke standing.
 *
 * A line rubbed through the middle is two lines afterwards, not none, which is what an
 * eraser does to ink and what the map editor's own rubbing out already works out per stroke.
 */
export function rubOutStrokes(layer: FreehandLayer, x: number, y: number, radius: number): boolean {
  const kept: FreehandLayer['strokes'] = [];
  let rubbed = false;

  for (const stroke of layer.strokes) {
    const runs = eraseStrokeAtPoint(stroke, x, y, radius);
    if (!runs) {
      kept.push(stroke);
      continue;
    }
    rubbed = true;
    for (const run of runs) kept.push({ ...run, id: newId() });
  }

  layer.strokes = kept;
  return rubbed;
}

/** What lies under the pointer, topmost first, so that a click takes what it looks like it takes. */
export function markUnder(scene: MapScene, at: BoardPoint): { kind: 'image' | 'text'; id: string } | null {
  const images = (scene.layers.find((layer) => layer.kind === 'image') as ImageLayer | undefined)?.items ?? [];
  for (let i = images.length - 1; i >= 0; i--) {
    const item = images[i];
    if (at.x >= item.x && at.x <= item.x + item.w && at.y >= item.y && at.y <= item.y + item.h) {
      return { kind: 'image', id: item.id };
    }
  }
  const texts = (scene.layers.find((layer) => layer.kind === 'text') as TextLayer | undefined)?.items ?? [];
  for (let i = texts.length - 1; i >= 0; i--) {
    const item = texts[i];
    const width = item.text.length * item.fontSize * 0.6;
    if (at.x >= item.x && at.x <= item.x + width && at.y >= item.y - item.fontSize && at.y <= item.y) {
      return { kind: 'text', id: item.id };
    }
  }
  return null;
}
