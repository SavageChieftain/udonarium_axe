import { GridType } from '@axe/domain/tabletop/game-table';
import { ShapeGeneratorKind } from '@axe/features/map-editor/model/editor-tool';
import {
  createLayer,
  createScene,
  FreehandLayer,
  ImageItem,
  ImageLayer,
  MapLayer,
  MapScene,
  newId,
  SceneGuideLine,
  sceneHeightPx,
  sceneWidthPx,
  ShapeItem,
  ShapeLayer,
  ShapeShadow,
  StrokeDash,
  TextAlign,
  TextItem,
  TextLayer,
  TextOutline,
} from '@axe/features/map-editor/model/scene';
import { eraseStrokeAtPoint } from '@axe/features/map-editor/model/scene-ops';
import { generateShapePoints } from '@axe/features/map-editor/model/shape-points';

/**
 * What a board can be marked with.
 *
 * A board is not a map: nothing is painted cell by cell on one, and it has no grid to paint
 * on. What it has is a pen, a straight edge, a few shapes, words, and whatever is stuck to
 * it, which is why it has an editor of its own rather than the one that draws maps.
 */
export type BoardTool =
  'select' | 'hand' | 'pen' | 'marker' | 'eraser' | 'line' | 'arrow' | 'shape' | 'path' | 'text' | 'note' | 'sticker';

export const BOARD_TOOLS: readonly BoardTool[] = [
  'select',
  'hand',
  'pen',
  'marker',
  'eraser',
  'line',
  'arrow',
  'shape',
  'path',
  'text',
  'note',
  'sticker',
];

/** The shapes a board can be marked with, which are the ones a map can be marked with. */
export const BOARD_SHAPES: readonly ShapeGeneratorKind[] = [
  'rect',
  'ellipse',
  'triangle',
  'pentagon',
  'hexagon',
  'star5',
  'star6',
  'balloon',
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
  fillColor?: string;
  dash?: StrokeDash;
  shadow?: boolean;
  outline?: string;
  outlineWidth?: number;
  underline?: boolean;
  strike?: boolean;
}

/** The line struck round letters, against the size of the letters themselves. */
export function outlineFor(style: MarkStyle): TextOutline | null {
  const width = style.outlineWidth ?? 0;
  if (width <= 0 || !style.outline) return null;
  return { color: style.outline, width: (style.fontSize * width) / 100 };
}

/** What a shape is dropped onto the sheet with when it is asked to cast a shadow. */
export const MARK_SHADOW: ShapeShadow = { color: 'rgba(0,0,0,0.35)', blur: 8, offsetX: 3, offsetY: 4 };

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

/** A shape is drawn corner to corner, whichever way round it was dragged. */
export function shapeBetween(
  kind: ShapeGeneratorKind,
  from: BoardPoint,
  to: BoardPoint,
  style: MarkStyle,
  filled = false
): ShapeItem {
  const x = Math.min(from.x, to.x);
  const y = Math.min(from.y, to.y);
  const w = Math.abs(to.x - from.x);
  const h = Math.abs(to.y - from.y);
  const boxy = kind === 'rect' || kind === 'ellipse';
  return {
    id: newId(),
    shape: boxy ? (kind as 'rect' | 'ellipse') : 'polygon',
    points: boxy ? [x, y, w, h] : generateShapePoints(kind, x, y, w, h),
    fill: filled ? { type: 'solid', color: style.fillColor ?? style.color } : null,
    stroke: { color: style.color, width: style.width, dash: style.dash ?? 'solid' },
    rotation: 0,
    shadow: style.shadow ? { ...MARK_SHADOW } : null,
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
    outline: outlineFor(style),
    shadow: style.shadow ? { ...MARK_SHADOW } : null,
    underline: !!style.underline,
    strike: !!style.strike,
  };
}

/** A sticker goes down around where it was put, at the size and shape it actually is. */
export function stickerAt(
  at: BoardPoint,
  imageIdentifier: string,
  fallback: number,
  natural?: BoardPoint,
  room?: NaturalSize
): ImageItem {
  const { w, h } = stickerSize(fallback, natural, room);
  return { id: newId(), imageIdentifier, x: at.x, y: at.y, w, h, rotation: 0, opacity: 1 };
}

/**
 * How big a picture goes down: the size it actually is.
 *
 * A screenshot stuck onto a board at some size of the board's choosing has to be dragged back
 * out to the size it already was, and never quite gets there. It only gives way when it will
 * not fit on the sheet at all, where leaving it be would put its own corners out of reach.
 */
export function stickerSize(fallback: number, natural?: BoardPoint, room?: NaturalSize): { w: number; h: number } {
  const wide = natural && natural.x > 0 ? natural.x : 0;
  const tall = natural && natural.y > 0 ? natural.y : 0;
  if (wide <= 0 || tall <= 0) return { w: fallback, h: fallback };

  const spare = room && room.w > 0 && room.h > 0 ? Math.min(room.w / wide, room.h / tall, 1) : 1;
  return { w: wide * spare, h: tall * spare };
}

/**
 * Where a picture actually sits.
 *
 * A picture is hung by its middle rather than by its corner, which is how it is drawn and how
 * it stays put when it is turned. The hold, the guides and the pointer all have to agree with
 * the paint, so they all ask here.
 */
export function imageBox(item: ImageItem): MarkBox {
  return { x: item.x - item.w / 2, y: item.y - item.h / 2, w: item.w, h: item.h };
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

/** A bundle of sheets, kept together so a whole part of the drawing can be hidden at once. */
export interface LayerGroup {
  name: string;
  layers: MapLayer[];
}

/**
 * The sheets as they are stacked, gathered into the bundles they are filed under.
 *
 * Sheets in one bundle are shown together wherever the topmost of them sits, so hiding the
 * bundle hides the whole of a drawing rather than one sheet of it at a time.
 */
export function groupLayers(scene: MapScene): LayerGroup[] {
  const groups: LayerGroup[] = [];
  const byName = new Map<string, LayerGroup>();

  for (let i = scene.layers.length - 1; i >= 0; i--) {
    const layer = scene.layers[i];
    const name = layer.group ?? '';
    if (!name) {
      groups.push({ name: '', layers: [layer] });
      continue;
    }
    const found = byName.get(name);
    if (found) {
      found.layers.push(layer);
      continue;
    }
    const made: LayerGroup = { name, layers: [layer] };
    byName.set(name, made);
    groups.push(made);
  }

  return groups;
}

/** The bundles that exist, so a sheet can be filed under one that is already there. */
export function groupNames(scene: MapScene): string[] {
  const names = new Set<string>();
  for (const layer of scene.layers) {
    if (layer.group) names.add(layer.group);
  }
  return [...names];
}

export function fileUnder(layer: MapLayer, group: string): void {
  layer.group = group.length > 0 ? group : undefined;
}

/** Renames a bundle, taking every sheet in it with the name. */
export function renameGroup(scene: MapScene, from: string, to: string): void {
  for (const layer of scene.layers) {
    if (layer.group === from) layer.group = to.length > 0 ? to : undefined;
  }
}

export function showGroup(scene: MapScene, name: string, visible: boolean): void {
  for (const layer of scene.layers) {
    if ((layer.group ?? '') === name) layer.visible = visible;
  }
}

/** Everything on the board that can be taken hold of, whatever sort of mark it is. */
export type MarkKind = 'image' | 'text' | 'shape' | 'stroke';

export interface MarkRef {
  kind: MarkKind;
  id: string;
}

export interface MarkBox extends BoardPoint {
  w: number;
  h: number;
}

function strokeBox(points: readonly number[]): MarkBox | null {
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

/**
 * How wide a line of words is.
 *
 * Counting characters and multiplying by six tenths of the size is right for the alphabet
 * and wrong by nearly half for Japanese, whose characters are a full square each, so a
 * Japanese line could not be taken hold of by its right half. The editor lends the canvas's
 * own measurement; the guess below is what is left when there is no canvas to ask.
 */
let measureLine: ((text: string, fontSize: number, bold: boolean, italic: boolean) => number) | null = null;

/**
 * Lends a way of measuring words, and hands back the way to stop lending it.
 *
 * The measurer is one thing for the whole module, so an editor that installs one and closes
 * leaves every later reckoning going through a canvas that has gone: open two boards, close
 * the second, and the first is measured by the dead one. Giving it back on the way out costs
 * nothing and keeps the answer to how wide a word is from depending on what was opened when.
 */
export function useTextMeasurer(measure: typeof measureLine): () => void {
  const was = measureLine;
  measureLine = measure;
  return () => {
    if (measureLine === measure) measureLine = was;
  };
}

/** Full width characters take a whole square; the rest take about six tenths of one. */
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

/** Words are drawn from their top, and a note carries a card round them. */
export function textBox(item: TextItem): MarkBox {
  const lines = item.text.split('\n');
  const widest = lines.reduce((most, line) => Math.max(most, lineWidth(line, item)), item.fontSize);
  // The line struck round the letters stands outside them, so the hold has to reach past it.
  const pad = (item.background ? item.fontSize * 0.5 : 0) + (item.outline?.width ?? 0);
  // Words are laid out from wherever they are set to start, so a hold on centred or right-hand
  // words reaches back the way they run rather than forward from the point they are hung on.
  const left = item.align === 'center' ? item.x - widest / 2 : item.align === 'right' ? item.x - widest : item.x;
  return {
    x: left - pad,
    y: item.y - pad,
    w: widest + pad * 2,
    h: lines.length * item.fontSize * 1.2 + pad * 2,
  };
}

function shapeBox(item: ShapeItem): MarkBox | null {
  if (item.shape === 'rect' || item.shape === 'ellipse') {
    const [x, y, w, h] = item.points;
    return { x, y, w, h };
  }
  return strokeBox(item.points);
}

/** Where a mark sits and how big it is, so a hold on it can be drawn round it. */
export function boxOf(scene: MapScene, ref: MarkRef): MarkBox | null {
  for (const layer of scene.layers) {
    if (ref.kind === 'image' && layer.kind === 'image') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) return imageBox(item);
    }
    if (ref.kind === 'text' && layer.kind === 'text') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) return textBox(item);
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) return shapeBox(item);
    }
    if (ref.kind === 'stroke' && layer.kind === 'freehand') {
      const item = layer.strokes.find((entry) => entry.id === ref.id);
      if (item) return strokeBox(item.points);
    }
  }
  return null;
}

/** How near a stroke a pointer has to land to have taken hold of it. */
const GRAB_SLACK = 6;

/**
 * What the pointer has taken hold of, topmost first.
 *
 * Anything drawn can be taken hold of, not only what was stuck on: a line drawn in the wrong
 * place is moved rather than rubbed out and drawn again, which is what anyone expects of a
 * thing they can see.
 */
export function markUnder(scene: MapScene, at: BoardPoint): MarkRef | null {
  for (let i = scene.layers.length - 1; i >= 0; i--) {
    const layer = scene.layers[i];
    if (!layer.visible || layer.locked) continue;

    if (layer.kind === 'image') {
      for (let n = layer.items.length - 1; n >= 0; n--) {
        const box = imageBox(layer.items[n]);
        if (at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h) {
          return { kind: 'image', id: layer.items[n].id };
        }
      }
    }
    if (layer.kind === 'text') {
      for (let n = layer.items.length - 1; n >= 0; n--) {
        const box = boxOf(scene, { kind: 'text', id: layer.items[n].id });
        if (box && within(at, box, 0)) return { kind: 'text', id: layer.items[n].id };
      }
    }
    if (layer.kind === 'shape') {
      for (let n = layer.items.length - 1; n >= 0; n--) {
        const box = shapeBox(layer.items[n]);
        if (box && within(at, box, GRAB_SLACK)) return { kind: 'shape', id: layer.items[n].id };
      }
    }
    if (layer.kind === 'freehand') {
      for (let n = layer.strokes.length - 1; n >= 0; n--) {
        const box = strokeBox(layer.strokes[n].points);
        if (box && within(at, box, GRAB_SLACK)) return { kind: 'stroke', id: layer.strokes[n].id };
      }
    }
  }
  return null;
}

function within(at: BoardPoint, box: MarkBox, slack: number): boolean {
  return (
    at.x >= box.x - slack && at.x <= box.x + box.w + slack && at.y >= box.y - slack && at.y <= box.y + box.h + slack
  );
}

/** Moves whatever was taken hold of, whichever sort of mark it turned out to be. */
export function moveMark(scene: MapScene, ref: MarkRef, dx: number, dy: number): void {
  for (const layer of scene.layers) {
    if (ref.kind === 'image' && layer.kind === 'image') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        item.x += dx;
        item.y += dy;
      }
    }
    if (ref.kind === 'text' && layer.kind === 'text') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        item.x += dx;
        item.y += dy;
      }
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) shiftPoints(item, dx, dy);
    }
    if (ref.kind === 'stroke' && layer.kind === 'freehand') {
      const item = layer.strokes.find((entry) => entry.id === ref.id);
      if (item) item.points = item.points.map((value, index) => value + (index % 2 === 0 ? dx : dy));
    }
  }
}

function shiftPoints(item: ShapeItem, dx: number, dy: number): void {
  if (item.shape === 'rect' || item.shape === 'ellipse') {
    item.points = [item.points[0] + dx, item.points[1] + dy, item.points[2], item.points[3]];
    return;
  }
  item.points = item.points.map((value, index) => value + (index % 2 === 0 ? dx : dy));
}

/** Stretches whatever was taken hold of, about its own top left corner. */
export function scaleMark(scene: MapScene, ref: MarkRef, box: MarkBox, kx: number, ky: number): void {
  const grow = (x: number, y: number): [number, number] => [box.x + (x - box.x) * kx, box.y + (y - box.y) * ky];

  for (const layer of scene.layers) {
    if (ref.kind === 'image' && layer.kind === 'image') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        const [x, y] = grow(item.x, item.y);
        item.x = x;
        item.y = y;
        item.w *= kx;
        item.h *= ky;
      }
    }
    if (ref.kind === 'text' && layer.kind === 'text') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) item.fontSize = Math.max(6, item.fontSize * Math.max(kx, ky));
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (!item) continue;
      if (item.shape === 'rect' || item.shape === 'ellipse') {
        const [x, y] = grow(item.points[0], item.points[1]);
        item.points = [x, y, item.points[2] * kx, item.points[3] * ky];
      } else {
        item.points = item.points.map((value, index) => (index % 2 === 0 ? grow(value, 0)[0] : grow(0, value)[1]));
      }
    }
    if (ref.kind === 'stroke' && layer.kind === 'freehand') {
      const item = layer.strokes.find((entry) => entry.id === ref.id);
      if (item)
        item.points = item.points.map((value, index) => (index % 2 === 0 ? grow(value, 0)[0] : grow(0, value)[1]));
    }
  }
}

/** Takes a mark off the board, whichever sort it is. */
export function removeMark(scene: MapScene, ref: MarkRef): void {
  for (const layer of scene.layers) {
    if (ref.kind === 'image' && layer.kind === 'image') layer.items = layer.items.filter((e) => e.id !== ref.id);
    if (ref.kind === 'text' && layer.kind === 'text') layer.items = layer.items.filter((e) => e.id !== ref.id);
    if (ref.kind === 'shape' && layer.kind === 'shape') layer.items = layer.items.filter((e) => e.id !== ref.id);
    if (ref.kind === 'stroke' && layer.kind === 'freehand')
      layer.strokes = layer.strokes.filter((e) => e.id !== ref.id);
  }
}

/** The corners a hold can be taken by, named for the compass so the maths reads plainly. */
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'turn';

export const HANDLES: readonly Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'turn'];

/** How far above the hold the grip for turning it sits. */
export const TURN_GRIP_REACH = 22;

export function handleAt(box: MarkBox, handle: Handle): BoardPoint {
  if (handle === 'turn') return { x: box.x + box.w / 2, y: box.y - TURN_GRIP_REACH };
  const x = handle.includes('w') ? box.x : handle.includes('e') ? box.x + box.w : box.x + box.w / 2;
  const y = handle.includes('n') ? box.y : handle.includes('s') ? box.y + box.h : box.y + box.h / 2;
  return { x, y };
}

/** Which grip on the hold the pointer landed on, if it landed on one at all. */
export function handleUnder(at: BoardPoint, box: MarkBox, slack: number): Handle | null {
  for (const handle of HANDLES) {
    const grip = handleAt(box, handle);
    if (Math.abs(at.x - grip.x) <= slack && Math.abs(at.y - grip.y) <= slack) return handle;
  }
  return null;
}

/** The corner a pulled grip is anchored against — a side pulls away from the side facing it. */
export function anchorFor(box: MarkBox, handle: Handle): BoardPoint {
  return {
    x: handle.includes('w') ? box.x + box.w : box.x,
    y: handle.includes('n') ? box.y + box.h : box.y,
  };
}

/** How a pulled grip stretches the hold: a side grip leaves the other way alone. */
export function stretchBy(box: MarkBox, handle: Handle, at: BoardPoint): { kx: number; ky: number } {
  const anchor = anchorFor(box, handle);
  const across = handle === 'n' || handle === 's' ? 1 : Math.abs(at.x - anchor.x) / Math.max(1, box.w);
  const down = handle === 'e' || handle === 'w' ? 1 : Math.abs(at.y - anchor.y) / Math.max(1, box.h);
  return { kx: Math.max(MIN_STRETCH, across), ky: Math.max(MIN_STRETCH, down) };
}

/** Nothing may be squashed away to nothing, or there would be no grip left to pull back out. */
const MIN_STRETCH = 0.05;

/** The angle from the middle of the hold out to the pointer, which is where the turn grip points. */
export function angleFrom(box: MarkBox, at: BoardPoint): number {
  const dx = at.x - (box.x + box.w / 2);
  const dy = at.y - (box.y + box.h / 2);
  return (Math.atan2(dy, dx) * 180) / Math.PI + 90;
}

/** How long the head of an arrow is against its shaft, and how wide it opens. */
const ARROW_HEAD = 0.22;
const ARROW_SPREAD = 0.4;

/**
 * An arrow, as a shaft with two barbs drawn back from its point.
 *
 * A line with nothing on the end of it says two things are joined; an arrow says which way
 * round, which is most of what anyone draws on a board to explain something.
 */
export function arrowBetween(from: BoardPoint, to: BoardPoint, style: MarkStyle): ShapeItem {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const head = Math.min(length * ARROW_HEAD, style.width * 6 + 16);
  const ux = dx / length;
  const uy = dy / length;
  const back = { x: to.x - ux * head, y: to.y - uy * head };
  const wing = head * ARROW_SPREAD;

  return {
    id: newId(),
    shape: 'polyline',
    points: [
      from.x,
      from.y,
      to.x,
      to.y,
      back.x - uy * wing,
      back.y + ux * wing,
      to.x,
      to.y,
      back.x + uy * wing,
      back.y - ux * wing,
    ],
    fill: null,
    stroke: { color: style.color, width: style.width, dash: 'solid' },
    rotation: 0,
  };
}

/** A note: words on a card, which moves and is thrown away as the one thing. */
export function noteAt(at: BoardPoint, text: string, style: MarkStyle, card: string): TextItem {
  return { ...wordsAt(at, text, style), background: card };
}

/** Ink that lets what is under it show through, for marking up rather than drawing. */
export function highlighterStyle(style: MarkStyle): MarkStyle {
  return { ...style, color: withAlpha(style.color, 0.38), width: Math.max(style.width * 3, 14) };
}

function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (!hex) return color;
  const r = parseInt(hex[1].slice(0, 2), 16);
  const g = parseInt(hex[1].slice(2, 4), 16);
  const b = parseInt(hex[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Rounded onto the ruling, so what is drawn to a plan lines up with the rest of it. */
export function snapTo(at: BoardPoint, spacing: number): BoardPoint {
  if (spacing <= 1) return at;
  return { x: Math.round(at.x / spacing) * spacing, y: Math.round(at.y / spacing) * spacing };
}

/** A copy of what is held, set down a little off the original so both can be seen. */
export function copyMark(scene: MapScene, ref: MarkRef, offset: number): MarkRef | null {
  for (const layer of scene.layers) {
    if (ref.kind === 'image' && layer.kind === 'image') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        const made = { ...item, id: newId(), x: item.x + offset, y: item.y + offset };
        layer.items.push(made);
        return { kind: 'image', id: made.id };
      }
    }
    if (ref.kind === 'text' && layer.kind === 'text') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        const made = {
          ...item,
          id: newId(),
          x: item.x + offset,
          y: item.y + offset,
          outline: item.outline ? { ...item.outline } : item.outline,
          shadow: item.shadow ? { ...item.shadow } : item.shadow,
        };
        layer.items.push(made);
        return { kind: 'text', id: made.id };
      }
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        // How a mark is dressed is kept in objects of its own, and restyling one writes into
        // them. Handed on as they stand, recolouring the copy would recolour what it came from.
        const made = {
          ...item,
          id: newId(),
          points: [...item.points],
          stroke: item.stroke ? { ...item.stroke } : item.stroke,
          fill: item.fill ? { ...item.fill } : item.fill,
          shadow: item.shadow ? { ...item.shadow } : item.shadow,
        };
        layer.items.push(made);
        shiftPoints(made, offset, offset);
        return { kind: 'shape', id: made.id };
      }
    }
    if (ref.kind === 'stroke' && layer.kind === 'freehand') {
      const item = layer.strokes.find((entry) => entry.id === ref.id);
      if (item) {
        const made = {
          ...item,
          id: newId(),
          points: item.points.map((value, index) => value + (index % 2 === 0 ? offset : offset)),
        };
        layer.strokes.push(made);
        return { kind: 'stroke', id: made.id };
      }
    }
  }
  return null;
}

/** Brings a mark forward or sends it back within the sheet it is on. */
export function restack(scene: MapScene, ref: MarkRef, delta: number): void {
  for (const layer of scene.layers) {
    const list: { id: string }[] | null =
      ref.kind === 'image' && layer.kind === 'image'
        ? layer.items
        : ref.kind === 'text' && layer.kind === 'text'
          ? layer.items
          : ref.kind === 'shape' && layer.kind === 'shape'
            ? layer.items
            : ref.kind === 'stroke' && layer.kind === 'freehand'
              ? layer.strokes
              : null;
    if (!list) continue;
    const at = list.findIndex((entry) => entry.id === ref.id);
    if (at < 0) continue;
    const to = Math.min(list.length - 1, Math.max(0, at + delta));
    if (to === at) return;
    const [taken] = list.splice(at, 1);
    list.splice(to, 0, taken);
    return;
  }
}

/** Turns a mark about its own middle, in degrees. */
export function turnMark(scene: MapScene, ref: MarkRef, degrees: number): void {
  const box = boxOf(scene, ref);
  if (!box) return;
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const turn = (x: number, y: number): [number, number] => [
    cx + (x - cx) * cos - (y - cy) * sin,
    cy + (x - cx) * sin + (y - cy) * cos,
  ];

  for (const layer of scene.layers) {
    if (ref.kind === 'image' && layer.kind === 'image') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) item.rotation = (item.rotation + degrees) % 360;
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (!item) continue;
      if (item.shape === 'rect' || item.shape === 'ellipse') item.rotation = (item.rotation + degrees) % 360;
      else item.points = mapPairs(item.points, turn);
    }
    if (ref.kind === 'stroke' && layer.kind === 'freehand') {
      const item = layer.strokes.find((entry) => entry.id === ref.id);
      if (item) item.points = mapPairs(item.points, turn);
    }
  }
}

function mapPairs(points: readonly number[], turn: (x: number, y: number) => [number, number]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const [x, y] = turn(points[i], points[i + 1]);
    out.push(x, y);
  }
  return out;
}

/** What a mark is drawn in, so what is already on the board can be changed rather than redrawn. */
export interface MarkStyleChange {
  color?: string;
  width?: number;
  fontSize?: number;
  background?: string | null;
  bold?: boolean;
  italic?: boolean;
  align?: TextAlign;
  dash?: StrokeDash;
  filled?: boolean;
  fillColor?: string;
  shadow?: boolean;
  outline?: string;
  outlineWidth?: number;
  underline?: boolean;
  strike?: boolean;
}

/**
 * Restyles what is held.
 *
 * A line drawn in the wrong colour was a line to be rubbed out and drawn again, which is not
 * how anything else works: the ink settings reach what is already down, not only what is next.
 */
export function restyleMark(scene: MapScene, ref: MarkRef, change: MarkStyleChange): void {
  for (const layer of scene.layers) {
    if (ref.kind === 'stroke' && layer.kind === 'freehand') {
      const item = layer.strokes.find((entry) => entry.id === ref.id);
      if (!item) continue;
      if (change.color) item.color = item.color.startsWith('rgba') ? withAlpha(change.color, 0.38) : change.color;
      if (change.width) item.width = change.width;
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (!item) continue;
      if (item.stroke) {
        if (change.color) item.stroke.color = change.color;
        if (change.width) item.stroke.width = change.width;
        if (change.dash) item.stroke.dash = change.dash;
      }
      if (change.filled !== undefined) {
        const paint = change.fillColor ?? (item.fill?.type === 'solid' ? item.fill.color : null);
        item.fill = change.filled ? { type: 'solid', color: paint ?? item.stroke?.color ?? '#000000' } : null;
      } else if (change.fillColor && item.fill?.type === 'solid') {
        item.fill = { type: 'solid', color: change.fillColor };
      }
      if (change.shadow !== undefined) item.shadow = change.shadow ? { ...MARK_SHADOW } : null;
    }
    if (ref.kind === 'text' && layer.kind === 'text') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (!item) continue;
      if (change.color) item.color = change.color;
      if (change.fontSize) item.fontSize = change.fontSize;
      if (change.bold !== undefined) item.bold = change.bold;
      if (change.italic !== undefined) item.italic = change.italic;
      if (change.align) item.align = change.align;
      if (change.background !== undefined) item.background = change.background ?? undefined;
      if (change.underline !== undefined) item.underline = change.underline;
      if (change.strike !== undefined) item.strike = change.strike;
      if (change.shadow !== undefined) item.shadow = change.shadow ? { ...MARK_SHADOW } : null;
      if (change.outline !== undefined || change.outlineWidth !== undefined) {
        const width = change.outlineWidth ?? (item.outline ? (item.outline.width / item.fontSize) * 100 : 0);
        const colour = change.outline ?? item.outline?.color ?? '#ffffff';
        item.outline = width > 0 ? { color: colour, width: (item.fontSize * width) / 100 } : null;
      }
    }
  }
}

/** The sheet a written mark lives on, which is not always the one being worked on. */
export function sheetHolding(scene: MapScene, ref: MarkRef): MapLayer | null {
  for (const layer of scene.layers) {
    if (layer.kind === 'text' && ref.kind === 'text' && layer.items.some((item) => item.id === ref.id)) return layer;
    if (layer.kind === 'shape' && ref.kind === 'shape' && layer.items.some((item) => item.id === ref.id)) return layer;
    if (layer.kind === 'image' && ref.kind === 'image' && layer.items.some((item) => item.id === ref.id)) return layer;
    if (layer.kind === 'freehand' && ref.kind === 'stroke' && layer.strokes.some((item) => item.id === ref.id)) {
      return layer;
    }
  }
  return null;
}

/** The words already written, so they can be typed over rather than written again. */
export function wordsOf(scene: MapScene, ref: MarkRef): TextItem | null {
  if (ref.kind !== 'text') return null;
  for (const layer of scene.layers) {
    if (layer.kind !== 'text') continue;
    const item = layer.items.find((entry) => entry.id === ref.id);
    if (item) return item;
  }
  return null;
}

/** Everything caught inside a dragged out box, so several things can be taken at once. */
export function marksWithin(scene: MapScene, area: MarkBox): MarkRef[] {
  const caught: MarkRef[] = [];
  const holds = (box: MarkBox | null) =>
    !!box && box.x >= area.x && box.y >= area.y && box.x + box.w <= area.x + area.w && box.y + box.h <= area.y + area.h;

  for (const layer of scene.layers) {
    if (!layer.visible || layer.locked) continue;
    if (layer.kind === 'image') {
      for (const item of layer.items) {
        if (holds(imageBox(item))) caught.push({ kind: 'image', id: item.id });
      }
    }
    if (layer.kind === 'text') {
      for (const item of layer.items) {
        if (holds(textBox(item))) caught.push({ kind: 'text', id: item.id });
      }
    }
    if (layer.kind === 'shape') {
      for (const item of layer.items) {
        if (holds(boxOf(scene, { kind: 'shape', id: item.id }))) caught.push({ kind: 'shape', id: item.id });
      }
    }
    if (layer.kind === 'freehand') {
      for (const item of layer.strokes) {
        if (holds(boxOf(scene, { kind: 'stroke', id: item.id }))) caught.push({ kind: 'stroke', id: item.id });
      }
    }
  }
  return caught;
}

/** The one box that holds all of them, which is what a hold on several things is drawn as. */
export function boxAround(scene: MapScene, refs: readonly MarkRef[]): MarkBox | null {
  let bounds: MarkBox | null = null;
  for (const ref of refs) {
    const box = boxOf(scene, ref);
    if (!box) continue;
    if (!bounds) {
      bounds = { ...box };
      continue;
    }
    const right = Math.max(bounds.x + bounds.w, box.x + box.w);
    const bottom = Math.max(bounds.y + bounds.h, box.y + box.h);
    bounds.x = Math.min(bounds.x, box.x);
    bounds.y = Math.min(bounds.y, box.y);
    bounds.w = right - bounds.x;
    bounds.h = bottom - bounds.y;
  }
  return bounds;
}

export type AlignEdge = 'left' | 'centre' | 'right' | 'top' | 'middle' | 'bottom';

/**
 * Puts what is held in the middle of the sheet, keeping the marks where they are to each other.
 *
 * Lining marks up against one another and putting them in the middle of the page are two
 * different jobs: a title centred on its neighbours is still off to one side of the slide.
 * They move as one thing, so a group laid out carefully is not pulled apart by being centred.
 */
export function centreOnSheet(scene: MapScene, refs: readonly MarkRef[], way: 'across' | 'down' | 'both'): void {
  const bounds = boxAround(scene, refs);
  if (!bounds) return;

  const dx = way === 'down' ? 0 : (sceneWidthPx(scene) - bounds.w) / 2 - bounds.x;
  const dy = way === 'across' ? 0 : (sceneHeightPx(scene) - bounds.h) / 2 - bounds.y;
  if (!dx && !dy) return;
  for (const ref of refs) moveMark(scene, ref, dx, dy);
}

/**
 * Lines several marks up against one another.
 *
 * Nudging each one by hand until they look level is what anyone does without this, and they
 * never quite are. They are lined up against the box that holds all of them.
 */
export function alignMarks(scene: MapScene, refs: readonly MarkRef[], edge: AlignEdge): void {
  const bounds = boxAround(scene, refs);
  if (!bounds || refs.length < 2) return;

  for (const ref of refs) {
    const box = boxOf(scene, ref);
    if (!box) continue;
    let dx = 0;
    let dy = 0;
    if (edge === 'left') dx = bounds.x - box.x;
    if (edge === 'right') dx = bounds.x + bounds.w - (box.x + box.w);
    if (edge === 'centre') dx = bounds.x + bounds.w / 2 - (box.x + box.w / 2);
    if (edge === 'top') dy = bounds.y - box.y;
    if (edge === 'bottom') dy = bounds.y + bounds.h - (box.y + box.h);
    if (edge === 'middle') dy = bounds.y + bounds.h / 2 - (box.y + box.h / 2);
    if (dx || dy) moveMark(scene, ref, dx, dy);
  }
}

/** Sets even gaps between them, along whichever way they are more spread out. */
export function spreadMarks(scene: MapScene, refs: readonly MarkRef[], along: 'x' | 'y'): void {
  if (refs.length < 3) return;
  const measured = refs
    .map((ref) => ({ ref, box: boxOf(scene, ref) }))
    .filter((entry): entry is { ref: MarkRef; box: MarkBox } => entry.box !== null)
    .sort((left, right) => left.box[along] - right.box[along]);
  if (measured.length < 3) return;

  const first = measured[0].box;
  const last = measured[measured.length - 1].box;
  const span = along === 'x' ? last.x + last.w - first.x : last.y + last.h - first.y;
  const filled = measured.reduce((total, entry) => total + (along === 'x' ? entry.box.w : entry.box.h), 0);
  const gap = (span - filled) / (measured.length - 1);

  let at = along === 'x' ? first.x : first.y;
  for (const entry of measured) {
    const was = along === 'x' ? entry.box.x : entry.box.y;
    const shift = at - was;
    if (shift) moveMark(scene, entry.ref, along === 'x' ? shift : 0, along === 'y' ? shift : 0);
    at += (along === 'x' ? entry.box.w : entry.box.h) + gap;
  }
}

/**
 * How far a point may sit off the line between its neighbours before it is worth keeping.
 *
 * A pen reports a point every few milliseconds, so a stroke drawn slowly carries hundreds of
 * them, most saying nothing the two either side did not. They cost synchronisation and make
 * the line jitter where the hand did.
 */
const SMOOTH_SLACK = 1.1;

/** Thins a freehand stroke down to the points that carry its shape, and rounds the corners. */
export function smoothStroke(points: readonly number[]): number[] {
  if (points.length <= 6) return [...points];
  const kept = thin(points, 0, points.length / 2 - 1, SMOOTH_SLACK);
  if (kept.length <= 6) return kept;

  // Each kept point is pulled a quarter of the way towards each of its neighbours, which
  // takes the wobble out of a hand-drawn line without moving where the line goes.
  const eased = [kept[0], kept[1]];
  for (let i = 2; i < kept.length - 2; i += 2) {
    eased.push(
      kept[i] * 0.5 + kept[i - 2] * 0.25 + kept[i + 2] * 0.25,
      kept[i + 1] * 0.5 + kept[i - 1] * 0.25 + kept[i + 3] * 0.25
    );
  }
  eased.push(kept[kept.length - 2], kept[kept.length - 1]);
  return eased;
}

/** Douglas-Peucker: keeps the point furthest off the line, and asks the same of each half. */
function thin(points: readonly number[], first: number, last: number, slack: number): number[] {
  const ax = points[first * 2];
  const ay = points[first * 2 + 1];
  const bx = points[last * 2];
  const by = points[last * 2 + 1];
  let worst = 0;
  let at = first;

  for (let i = first + 1; i < last; i++) {
    const off = awayFromLine(points[i * 2], points[i * 2 + 1], ax, ay, bx, by);
    if (off > worst) {
      worst = off;
      at = i;
    }
  }
  if (worst <= slack) return [ax, ay, bx, by];
  return [...thin(points, first, at, slack).slice(0, -2), ...thin(points, at, last, slack)];
}

function awayFromLine(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const span = dx * dx + dy * dy;
  if (span === 0) return Math.hypot(px - ax, py - ay);
  const along = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / span));
  return Math.hypot(px - (ax + along * dx), py - (ay + along * dy));
}

/** Everything on one sheet is swept off, leaving the sheet and everything under it. */
export function clearSheet(layer: MapLayer): void {
  if (layer.kind === 'freehand') layer.strokes = [];
  if (layer.kind === 'shape' || layer.kind === 'text' || layer.kind === 'image') layer.items = [];
  if (layer.kind === 'cell') layer.cells = {};
  if (layer.kind === 'stamp') layer.items = [];
}

/** Turns a picture over, which is how anyone makes a figure face the other way. */
export function flipMark(scene: MapScene, ref: MarkRef, way: 'across' | 'down'): void {
  if (ref.kind !== 'image') return;
  for (const layer of scene.layers) {
    if (layer.kind !== 'image') continue;
    const item = layer.items.find((entry) => entry.id === ref.id);
    if (!item) continue;
    if (way === 'across') item.flipX = !item.flipX;
    else item.flipY = !item.flipY;
  }
}

/** How solid a picture is, so one can be laid under the rest as a tracing to work over. */
export function fadeMark(scene: MapScene, ref: MarkRef, opacity: number): void {
  if (ref.kind !== 'image') return;
  for (const layer of scene.layers) {
    if (layer.kind !== 'image') continue;
    const item = layer.items.find((entry) => entry.id === ref.id);
    if (item) item.opacity = Math.min(1, Math.max(0, opacity));
  }
}

/**
 * A line through as many points as were set down, straight or curved.
 *
 * Two points make a connector between two boxes; a diagram wants one that goes round the
 * boxes in between, which a line between two points cannot do.
 */
export function pathThrough(points: readonly BoardPoint[], style: MarkStyle, curved: boolean): ShapeItem | null {
  if (points.length < 2) return null;
  return {
    id: newId(),
    shape: curved ? 'curve' : 'polyline',
    points: points.flatMap((at) => [at.x, at.y]),
    fill: null,
    stroke: { color: style.color, width: style.width, dash: style.dash ?? 'solid' },
    rotation: 0,
    shadow: style.shadow ? { ...MARK_SHADOW } : null,
  };
}

/** How big a picture is in its own pixels, before anything was trimmed off it. */
export interface NaturalSize {
  w: number;
  h: number;
}

/** The picture held, so its crop can be read and written. */
export function pictureOf(scene: MapScene, ref: MarkRef): ImageItem | null {
  if (ref.kind !== 'image') return null;
  for (const layer of scene.layers) {
    if (layer.kind !== 'image') continue;
    const item = layer.items.find((entry) => entry.id === ref.id);
    if (item) return item;
  }
  return null;
}

/**
 * Trims a picture down to the part of it that is wanted.
 *
 * A screenshot arrives with a window frame and a taskbar round what was actually being shown.
 * Shrinking it only makes the frame smaller; the frame has to come off.
 *
 * The window is given in the drawn picture's own pixels, and is kept in the source picture's,
 * so a picture already trimmed can be trimmed again without the first trim being lost.
 */
export function cropMark(scene: MapScene, ref: MarkRef, window: MarkBox, natural: NaturalSize): void {
  const item = pictureOf(scene, ref);
  if (!item || item.w <= 0 || item.h <= 0) return;
  const was = item.crop ?? { x: 0, y: 0, w: natural.w, h: natural.h };
  if (was.w <= 0 || was.h <= 0) return;

  const left = Math.max(0, Math.min(window.x, item.w));
  const top = Math.max(0, Math.min(window.y, item.h));
  const right = Math.max(left, Math.min(window.x + window.w, item.w));
  const bottom = Math.max(top, Math.min(window.y + window.h, item.h));
  if (right - left < 1 || bottom - top < 1) return;

  const acrossPer = was.w / item.w;
  const downPer = was.h / item.h;
  item.crop = {
    x: was.x + left * acrossPer,
    y: was.y + top * downPer,
    w: (right - left) * acrossPer,
    h: (bottom - top) * downPer,
  };
  // The picture shrinks to what is left of it, kept where its top left corner already was.
  item.x = item.x - item.w / 2 + left + (right - left) / 2;
  item.y = item.y - item.h / 2 + top + (bottom - top) / 2;
  item.w = right - left;
  item.h = bottom - top;
}

/** Puts back everything a picture was trimmed of, at the size it is being shown. */
export function uncropMark(scene: MapScene, ref: MarkRef, natural: NaturalSize): void {
  const item = pictureOf(scene, ref);
  if (!item?.crop) return;
  const grown = item.crop.w > 0 ? natural.w / item.crop.w : 1;
  item.w *= grown;
  item.h *= item.crop.h > 0 ? natural.h / item.crop.h : 1;
  delete item.crop;
}

/** A line the eye lines things up against: down the page constrains x, across it constrains y. */
export interface SnapGuide {
  axis: 'x' | 'y';
  at: number;
  /** How far the line is drawn, which is far enough to reach both things it lines up. */
  from: number;
  to: number;
}

export interface GuideSnap {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

/** How near a thing has to come to a line before the line takes it. */
export const GUIDE_SLACK = 6;

/**
 * Which lines what is being moved has come near, and how far to nudge it onto them.
 *
 * Graph paper only helps a mark that was laid down on the paper's own steps; two pictures of
 * unlike size never share a step, so their edges never agree however carefully they are
 * dragged. These are drawn off the other marks instead, so anything lines up with anything.
 */
export function guidesFor(
  scene: MapScene,
  moving: MarkBox,
  holding: readonly MarkRef[],
  spare: readonly SceneGuideLine[] = [],
  slack = GUIDE_SLACK
): GuideSnap {
  const held = new Set(holding.map((mark) => mark.kind + ':' + mark.id));
  const others: MarkBox[] = [];
  for (const layer of scene.layers) {
    if (!layer.visible) continue;
    for (const mark of marksOn(layer)) {
      if (held.has(mark.kind + ':' + mark.id)) continue;
      const box = boxOf(scene, mark);
      if (box) others.push(box);
    }
  }

  const across = bestLine('x', moving, others, scene, spare, slack);
  const down = bestLine('y', moving, others, scene, spare, slack);
  return {
    dx: across?.shift ?? 0,
    dy: down?.shift ?? 0,
    guides: [...(across?.guides ?? []), ...(down?.guides ?? [])],
  };
}

/** Every mark on one sheet, named so the ones in hand can be told apart from the rest. */
function marksOn(layer: MapLayer): MarkRef[] {
  if (layer.kind === 'freehand') return layer.strokes.map((item) => ({ kind: 'stroke', id: item.id }));
  if (layer.kind === 'shape') return layer.items.map((item) => ({ kind: 'shape', id: item.id }));
  if (layer.kind === 'text') return layer.items.map((item) => ({ kind: 'text', id: item.id }));
  if (layer.kind === 'image') return layer.items.map((item) => ({ kind: 'image', id: item.id }));
  return [];
}

function bestLine(
  axis: 'x' | 'y',
  moving: MarkBox,
  others: readonly MarkBox[],
  scene: MapScene,
  spare: readonly SceneGuideLine[],
  slack: number
): { shift: number; guides: SnapGuide[] } | null {
  const near = axis === 'x' ? moving.x : moving.y;
  const span = axis === 'x' ? moving.w : moving.h;
  const mine = [near, near + span / 2, near + span];

  let shift = 0;
  let closest = slack + 1;
  let at = 0;
  for (const edge of mine) {
    for (const line of linesAlong(axis, others, scene, spare)) {
      const gap = Math.abs(line - edge);
      if (gap < closest) {
        closest = gap;
        shift = line - edge;
        at = line;
      }
    }
  }
  if (closest > slack) return null;

  // The line is drawn only as far as the things it joins, not right across the sheet.
  const touching = others.filter((box) => Math.abs(reachOf(axis, box, at)) < 0.5);
  const ends = [...touching, moving].flatMap((box) => (axis === 'x' ? [box.y, box.y + box.h] : [box.x, box.x + box.w]));
  const from = Math.min(...ends);
  const to = Math.max(...ends);
  return { shift, guides: [{ axis, at, from, to }] };
}

/** Nought where the box has an edge or a middle on the line, and something else where it has not. */
function reachOf(axis: 'x' | 'y', box: MarkBox, at: number): number {
  const near = axis === 'x' ? box.x : box.y;
  const span = axis === 'x' ? box.w : box.h;
  return Math.min(Math.abs(near - at), Math.abs(near + span / 2 - at), Math.abs(near + span - at));
}

function linesAlong(
  axis: 'x' | 'y',
  others: readonly MarkBox[],
  scene: MapScene,
  spare: readonly SceneGuideLine[]
): number[] {
  const lines: number[] = [];
  for (const box of others) {
    const near = axis === 'x' ? box.x : box.y;
    const span = axis === 'x' ? box.w : box.h;
    lines.push(near, near + span / 2, near + span);
  }
  // The middle of the sheet, which is what anything meant to be looked at is hung on.
  const sheet = axis === 'x' ? sceneWidthPx(scene) : sceneHeightPx(scene);
  lines.push(sheet / 2);
  for (const guide of spare) {
    if (guide.axis === axis) lines.push(guide.at);
  }
  return lines;
}

/**
 * Where a single point lands once it has given in to the nearest line.
 *
 * A grip being pulled is one point rather than a box, and it is that point which has to meet
 * the line: an edge dragged to a hair off another edge is the whole reason guides exist.
 */
export function snapPoint(
  scene: MapScene,
  at: BoardPoint,
  holding: readonly MarkRef[],
  spare: readonly SceneGuideLine[] = [],
  slack = GUIDE_SLACK
): { at: BoardPoint; guides: SnapGuide[] } {
  const snap = guidesFor(scene, { x: at.x, y: at.y, w: 0, h: 0 }, holding, spare, slack);
  return { at: { x: at.x + snap.dx, y: at.y + snap.dy }, guides: snap.guides };
}

/** The lines that are always there, whether or not the paper is ruled. */
export function sheetGuides(scene: MapScene): SnapGuide[] {
  const wide = sceneWidthPx(scene);
  const tall = sceneHeightPx(scene);
  return [
    { axis: 'x', at: wide / 2, from: 0, to: tall },
    { axis: 'y', at: tall / 2, from: 0, to: wide },
  ];
}

/** A guide left on the sheet, near enough to the pointer to be taken hold of. */
export function guideUnder(
  guides: readonly SceneGuideLine[],
  at: BoardPoint,
  slack = GUIDE_SLACK
): SceneGuideLine | null {
  for (const guide of guides) {
    const near = guide.axis === 'x' ? at.x : at.y;
    if (Math.abs(near - guide.at) <= slack) return guide;
  }
  return null;
}

export function newGuide(axis: 'x' | 'y', at: number): SceneGuideLine {
  return { id: newId(), axis, at };
}

/** Steps a line onto eighths of a turn, so a connector meant to be square comes out square. */
export function squareOff(from: BoardPoint, to: BoardPoint): BoardPoint {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const reach = Math.hypot(dx, dy);
  if (reach < 1) return to;
  const step = Math.PI / 4;
  const turn = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: from.x + Math.cos(turn) * reach, y: from.y + Math.sin(turn) * reach };
}

/** What the sheet wears over the marks while it is being worked on. */
export interface Overlays {
  /** The ruling, which is the one thing the reader chooses to see or not. */
  grid: boolean;
  /** The guides, the hold and its grips, the band, and whatever is still under the pointer. */
  helpers: boolean;
}

/**
 * Whether to draw over the marks, and what.
 *
 * These are all for whoever is drawing rather than part of what is drawn, so they come off
 * together when the picture the board wears is taken. Ruling the paper is a separate question,
 * asked of the reader: turning it off must not take the guides, the hold or the line still
 * being laid down away with it.
 */
export function overlaysWanted(bare: boolean, gridVisible: boolean): Overlays {
  return { grid: !bare && gridVisible, helpers: !bare };
}

/**
 * Whether a key press belongs to whatever is being typed into rather than to the board.
 *
 * A key pressed into a box belongs to the box: backspace rubs out a letter there, not the
 * picture that happens to be held. An input method is stricter still. Writing Japanese
 * borrows the space bar to choose between candidates and escape to throw a candidate away,
 * and neither key has reached the board yet — the reader is still deciding what the letters
 * are. Nothing may be acted on until the composing is over.
 */
export function isTypingKey(target: EventTarget | null, composing: boolean): boolean {
  if (composing) return true;
  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLElement && target.isContentEditable;
}

/**
 * The chequer that stands for nothing at all.
 *
 * Two greys in squares is what every drawing tool puts behind an empty picture, so a reader
 * who has seen one anywhere else already knows what it means here: there is nothing under the
 * marks. It belongs to the editor and not to the board — a board on the table that has been
 * turned down is meant to be seen through, not to be seen as squares.
 */
export const CHEQUER_CLASS = '[background-image:repeating-conic-gradient(#c4c4c4_0%_25%,#f2f2f2_0%_50%)]';

/** The shapes that are a run of points rather than a box, and so have corners to take hold of. */
const JOINTED = new Set<ShapeItem['shape']>(['line', 'polyline', 'curve', 'polygon', 'closedCurve']);

/** The shape held, if it is one whose corners can be moved about one at a time. */
export function jointedShape(scene: MapScene, ref: MarkRef): ShapeItem | null {
  if (ref.kind !== 'shape') return null;
  for (const layer of scene.layers) {
    if (layer.kind !== 'shape') continue;
    const item = layer.items.find((entry) => entry.id === ref.id);
    if (item) return JOINTED.has(item.shape) ? item : null;
  }
  return null;
}

/** Which corner of a path the pointer landed on, counted in corners rather than in numbers. */
export function jointUnder(scene: MapScene, ref: MarkRef, at: BoardPoint, slack: number): number | null {
  const item = jointedShape(scene, ref);
  if (!item) return null;
  for (let joint = 0; joint * 2 + 1 < item.points.length; joint += 1) {
    const x = item.points[joint * 2];
    const y = item.points[joint * 2 + 1];
    if (Math.abs(at.x - x) <= slack && Math.abs(at.y - y) <= slack) return joint;
  }
  return null;
}

export function moveJoint(scene: MapScene, ref: MarkRef, joint: number, to: BoardPoint): void {
  const item = jointedShape(scene, ref);
  if (!item || joint * 2 + 1 >= item.points.length) return;
  item.points[joint * 2] = to.x;
  item.points[joint * 2 + 1] = to.y;
}

/**
 * Puts a new corner into the run where the pointer landed, on whichever stretch it landed on.
 *
 * A path drawn in one go is never quite the path that was wanted, and redrawing the whole
 * thing to move one bend is the sort of thing that makes people stop using a tool.
 */
export function addJoint(scene: MapScene, ref: MarkRef, at: BoardPoint, slack: number): number | null {
  const item = jointedShape(scene, ref);
  if (!item || item.points.length < 4) return null;

  let nearest = -1;
  let closest = slack;
  for (let joint = 0; joint * 2 + 3 < item.points.length; joint += 1) {
    const away = awayFromSegment(
      at,
      { x: item.points[joint * 2], y: item.points[joint * 2 + 1] },
      { x: item.points[joint * 2 + 2], y: item.points[joint * 2 + 3] }
    );
    if (away <= closest) {
      closest = away;
      nearest = joint;
    }
  }
  if (nearest < 0) return null;
  item.points.splice(nearest * 2 + 2, 0, at.x, at.y);
  return nearest + 1;
}

/** Takes a corner out, so long as two are left, a path with one point being nothing at all. */
export function dropJoint(scene: MapScene, ref: MarkRef, joint: number): boolean {
  const item = jointedShape(scene, ref);
  if (!item || item.points.length <= 4 || joint * 2 + 1 >= item.points.length) return false;
  item.points.splice(joint * 2, 2);
  return true;
}

function awayFromSegment(at: BoardPoint, from: BoardPoint, to: BoardPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = dx * dx + dy * dy;
  if (span === 0) return Math.hypot(at.x - from.x, at.y - from.y);
  const along = Math.max(0, Math.min(1, ((at.x - from.x) * dx + (at.y - from.y) * dy) / span));
  return Math.hypot(at.x - (from.x + along * dx), at.y - (from.y + along * dy));
}
