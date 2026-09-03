import { ImageItem, MapScene, ShapeItem, TextItem } from '@axe/features/map-editor/model/scene';

export interface BoardPoint {
  x: number;
  y: number;
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

export function within(at: BoardPoint, box: MarkBox, slack: number): boolean {
  return (
    at.x >= box.x - slack && at.x <= box.x + box.w + slack && at.y >= box.y - slack && at.y <= box.y + box.h + slack
  );
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
