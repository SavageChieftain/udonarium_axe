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
  ShapeItem,
  ShapeLayer,
  StrokeDash,
  TextAlign,
  TextItem,
  TextLayer,
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
  'select' | 'pen' | 'marker' | 'eraser' | 'line' | 'arrow' | 'shape' | 'text' | 'note' | 'sticker';

export const BOARD_TOOLS: readonly BoardTool[] = [
  'select',
  'pen',
  'marker',
  'eraser',
  'line',
  'arrow',
  'shape',
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
    fill: filled ? { type: 'solid', color: style.color } : null,
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

/**
 * A sticker goes down around where it was put, at the shape it actually is.
 *
 * Given a square to fill, a photograph three times as wide as it is tall is squashed into
 * one; the longest side is what is set instead, and the other follows from the picture.
 */
export function stickerAt(at: BoardPoint, imageIdentifier: string, longest: number, natural?: BoardPoint): ImageItem {
  const wide = natural && natural.x > 0 ? natural.x : 1;
  const tall = natural && natural.y > 0 ? natural.y : 1;
  const ratio = longest / Math.max(wide, tall);
  const w = wide * ratio;
  const h = tall * ratio;
  return {
    id: newId(),
    imageIdentifier,
    x: at.x - w / 2,
    y: at.y - h / 2,
    w,
    h,
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

export function useTextMeasurer(measure: typeof measureLine): void {
  measureLine = measure;
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
  const pad = item.background ? item.fontSize * 0.5 : 0;
  return {
    x: item.x - pad,
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
      if (item) return { x: item.x, y: item.y, w: item.w, h: item.h };
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
        const item = layer.items[n];
        if (at.x >= item.x && at.x <= item.x + item.w && at.y >= item.y && at.y <= item.y + item.h) {
          return { kind: 'image', id: item.id };
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
export type Handle = 'nw' | 'ne' | 'sw' | 'se';

export const HANDLES: readonly Handle[] = ['nw', 'ne', 'sw', 'se'];

export function handleAt(box: MarkBox, handle: Handle): BoardPoint {
  return {
    x: handle.includes('w') ? box.x : box.x + box.w,
    y: handle.includes('n') ? box.y : box.y + box.h,
  };
}

/** Which corner of the hold the pointer landed on, if it landed on one at all. */
export function handleUnder(at: BoardPoint, box: MarkBox, slack: number): Handle | null {
  for (const handle of HANDLES) {
    const corner = handleAt(box, handle);
    if (Math.abs(at.x - corner.x) <= slack && Math.abs(at.y - corner.y) <= slack) return handle;
  }
  return null;
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
        const made = { ...item, id: newId(), x: item.x + offset, y: item.y + offset };
        layer.items.push(made);
        return { kind: 'text', id: made.id };
      }
    }
    if (ref.kind === 'shape' && layer.kind === 'shape') {
      const item = layer.items.find((entry) => entry.id === ref.id);
      if (item) {
        const made = { ...item, id: newId(), points: [...item.points] };
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
        item.fill = change.filled ? { type: 'solid', color: change.color ?? item.stroke?.color ?? '#000000' } : null;
      } else if (change.color && item.fill?.type === 'solid') {
        item.fill = { type: 'solid', color: change.color };
      }
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
    }
  }
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
        if (holds({ x: item.x, y: item.y, w: item.w, h: item.h })) caught.push({ kind: 'image', id: item.id });
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
