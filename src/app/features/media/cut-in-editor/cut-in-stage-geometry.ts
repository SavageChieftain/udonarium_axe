/**
 * Where the scene sits inside the room the editor gives it, and how a pointer on the
 * screen maps back onto the cut-in's own coordinates.
 *
 * Nothing here touches the DOM: measurements come in as numbers, so every answer can be
 * checked without a browser.
 */

export interface StageBox {
  width: number;
  height: number;
}

export interface LayerBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StageFit {
  /** How much the scene is shrunk to fit. */
  scale: number;
  /** Where the scene's own origin lands inside the room, in screen pixels. */
  offsetX: number;
  offsetY: number;
}

export const RESIZE_HANDLES = ['nw', 'ne', 'sw', 'se'] as const;
export type ResizeHandle = (typeof RESIZE_HANDLES)[number];

export const HANDLE_TOLERANCE_PX = 8;
export const MIN_LAYER_SIZE = 8;

/** The scene shrunk to fit and centred, never grown past its own size. */
export function stageFit(scene: StageBox, room: StageBox): StageFit {
  if (scene.width < 1 || scene.height < 1 || room.width < 1 || room.height < 1) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(1, room.width / scene.width, room.height / scene.height);
  return {
    scale,
    offsetX: (room.width - scene.width * scale) / 2,
    offsetY: (room.height - scene.height * scale) / 2,
  };
}

/** A point on the screen, in the cut-in's own coordinates. */
export function stageToScene(px: number, py: number, fit: StageFit): { x: number; y: number } {
  return { x: (px - fit.offsetX) / fit.scale, y: (py - fit.offsetY) / fit.scale };
}

/** A point in the cut-in's own coordinates, on the screen. */
export function sceneToStage(x: number, y: number, fit: StageFit): { px: number; py: number } {
  return { px: x * fit.scale + fit.offsetX, py: y * fit.scale + fit.offsetY };
}

/** How far a drag on the screen carries in the cut-in's own coordinates. */
export function stageDeltaToScene(dx: number, dy: number, fit: StageFit): { x: number; y: number } {
  return { x: dx / fit.scale, y: dy / fit.scale };
}

/** The corner a pointer has hold of, or none where it has hold of the layer itself. */
export function resizeHandleAt(
  point: { x: number; y: number },
  box: LayerBox,
  fit: StageFit,
  tolerancePx = HANDLE_TOLERANCE_PX
): ResizeHandle | null {
  const reach = tolerancePx / Math.max(fit.scale, 0.0001);
  const corners: Record<ResizeHandle, { x: number; y: number }> = {
    nw: { x: box.x, y: box.y },
    ne: { x: box.x + box.width, y: box.y },
    sw: { x: box.x, y: box.y + box.height },
    se: { x: box.x + box.width, y: box.y + box.height },
  };

  for (const handle of RESIZE_HANDLES) {
    const corner = corners[handle];
    if (Math.abs(point.x - corner.x) <= reach && Math.abs(point.y - corner.y) <= reach) return handle;
  }
  return null;
}

/** Whether a point lies on a layer. */
export function isInsideLayer(point: { x: number; y: number }, box: LayerBox): boolean {
  return point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
}

/**
 * The box after a corner has been dragged.
 *
 * The opposite corner stays where it is. Keeping the shape follows whichever side was
 * pulled further, so the corner tracks the pointer as closely as the shape allows.
 */
export function applyResize(box: LayerBox, handle: ResizeHandle, dx: number, dy: number, keepAspect = false): LayerBox {
  const west = handle === 'nw' || handle === 'sw';
  const north = handle === 'nw' || handle === 'ne';

  let width = Math.max(MIN_LAYER_SIZE, box.width + (west ? -dx : dx));
  let height = Math.max(MIN_LAYER_SIZE, box.height + (north ? -dy : dy));

  if (keepAspect && box.width > 0 && box.height > 0) {
    const ratio = box.width / box.height;
    if (width / height > ratio) height = width / ratio;
    else width = height * ratio;
    width = Math.max(MIN_LAYER_SIZE, width);
    height = Math.max(MIN_LAYER_SIZE, height);
  }

  return {
    x: west ? box.x + box.width - width : box.x,
    y: north ? box.y + box.height - height : box.y,
    width,
    height,
  };
}
