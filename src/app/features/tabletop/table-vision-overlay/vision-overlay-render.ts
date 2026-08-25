import { OverlayPlan, OverlayShape, ShadowShape } from '@axe/domain/tabletop/vision-scene';

const TWO_PI = Math.PI * 2;

export interface OverlaySurface {
  originX: number;
  originY: number;
  cells?: { x: number; y: number }[][];
}

interface ResolvedSurface extends OverlaySurface {
  widthPx: number;
  heightPx: number;
}

export function hexToRgba(color: string, alpha: number): string {
  let hex = color.trim();
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
  if (hex.length < 6) return `rgba(255, 255, 255, ${alpha})`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function animationIntensity(animation: string | undefined, timeMs: number): number {
  switch (animation) {
    case 'pulse':
      return 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(timeMs / 350));
    case 'flicker':
      return 0.6 + 0.4 * Math.abs(Math.sin(timeMs * 0.013) * Math.sin(timeMs * 0.027 + 1.3));
    default:
      return 1;
  }
}

function glowColor(shape: OverlayShape, alpha: number, timeMs: number): string {
  if (shape.animation === 'neon') {
    const hue = (timeMs * 0.06) % 360;
    return `hsla(${hue.toFixed(0)}, 100%, 60%, ${alpha})`;
  }
  return hexToRgba(shape.color, alpha);
}

function beginClips(ctx: CanvasRenderingContext2D, shape: OverlayShape): boolean {
  const polygon = shape.clipPolygon;
  const hasPolygon = !!polygon && polygon.length >= 3;
  const hasCone = shape.angle < 360;
  if (!hasPolygon && !hasCone) return false;
  ctx.save();
  if (hasPolygon && polygon) {
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.closePath();
    ctx.clip();
  }
  if (hasCone) {
    const half = (shape.angle * Math.PI) / 360;
    const direction = (shape.direction * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(shape.x, shape.y);
    ctx.arc(shape.x, shape.y, Math.max(shape.dimPx, 1), direction - half, direction + half);
    ctx.closePath();
    ctx.clip();
  }
  return true;
}

function carveReveal(ctx: CanvasRenderingContext2D, shape: OverlayShape): void {
  const radius = Math.max(shape.dimPx, 1);
  const coned = beginClips(ctx, shape);
  if (shape.full) {
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  } else {
    const gradient = ctx.createRadialGradient(shape.x, shape.y, 0, shape.x, shape.y, radius);
    const brightStop = shape.dimPx > 0 ? Math.min(shape.brightPx / shape.dimPx, 1) : 1;
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(brightStop, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
  }
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, radius, 0, TWO_PI);
  ctx.fill();
  if (coned) ctx.restore();
}

function fillPolygons(ctx: CanvasRenderingContext2D, polygons: { x: number; y: number }[][]): void {
  ctx.beginPath();
  for (const polygon of polygons) {
    if (polygon.length < 3) continue;
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i++) ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.closePath();
  }
  ctx.fill();
}

function carveCells(ctx: CanvasRenderingContext2D, cells: { x: number; y: number }[][]): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  fillPolygons(ctx, cells);
}

function fillSurface(ctx: CanvasRenderingContext2D, surface: ResolvedSurface): void {
  if (surface.cells && surface.cells.length > 0) {
    fillPolygons(ctx, surface.cells);
    return;
  }
  ctx.fillRect(surface.originX, surface.originY, surface.widthPx, surface.heightPx);
}

function drawGlow(ctx: CanvasRenderingContext2D, shape: OverlayShape, timeMs: number): void {
  if (shape.dimPx <= 0) return;
  const coned = beginClips(ctx, shape);
  const intensity = animationIntensity(shape.animation, timeMs);
  const gradient = ctx.createRadialGradient(shape.x, shape.y, 0, shape.x, shape.y, shape.dimPx);
  const brightStop = Math.min(shape.brightPx / shape.dimPx, 1);
  gradient.addColorStop(0, glowColor(shape, 0.35 * intensity, timeMs));
  gradient.addColorStop(brightStop, glowColor(shape, 0.18 * intensity, timeMs));
  gradient.addColorStop(1, glowColor(shape, 0, timeMs));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(shape.x, shape.y, shape.dimPx, 0, TWO_PI);
  ctx.fill();
  if (coned) ctx.restore();
}

function clipToPolygon(ctx: CanvasRenderingContext2D, clip: { x: number; y: number }[] | undefined): boolean {
  if (!clip || clip.length < 3) return false;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(clip[0].x, clip[0].y);
  for (let i = 1; i < clip.length; i++) ctx.lineTo(clip[i].x, clip[i].y);
  ctx.closePath();
  ctx.clip();
  return true;
}

function drawShadow(ctx: CanvasRenderingContext2D, shadow: ShadowShape): void {
  if (shadow.points.length < 3) return;
  const clipped = clipToPolygon(ctx, shadow.clipPolygon);
  const gradient = ctx.createLinearGradient(shadow.x, shadow.y, shadow.fx, shadow.fy);
  gradient.addColorStop(0, hexToRgba(shadow.color, 0.6));
  gradient.addColorStop(1, hexToRgba(shadow.color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(shadow.points[0].x, shadow.points[0].y);
  for (let i = 1; i < shadow.points.length; i++) ctx.lineTo(shadow.points[i].x, shadow.points[i].y);
  ctx.closePath();
  ctx.fill();
  if (clipped) ctx.restore();
}

const SHADOW_BLUR_PX = 3;
const SHADOW_FILTER = `brightness(0) blur(${SHADOW_BLUR_PX}px)`;
/** The steps between baking scales. Finer steps bake more often, coarser ones drift from the softness the edge should have. */
const BAKE_SCALE_STEP = 1.5;

/**
 * The black silhouette a shadow is cast from.
 *
 * There is one for every light against every obstacle, and softening them all each
 * frame rasterises that many times, stretching a pass into hundreds of milliseconds. Each picture is baked once per scale.
 *
 * A baked picture is laid down smaller than it was baked, so the softening is widened
 * to match; a fixed amount would leave the edges of a large picture hard.
 */
interface Silhouette {
  canvas: HTMLCanvasElement;
  pad: number;
}

const silhouettes = new WeakMap<CanvasImageSource, Map<number, Silhouette | null>>();

function silhouetteOf(img: CanvasImageSource, iw: number, ih: number, scale: number): Silhouette | null {
  const step = Math.round(Math.log(Math.max(scale, 1e-3)) / Math.log(BAKE_SCALE_STEP));
  let byScale = silhouettes.get(img);
  if (!byScale) {
    byScale = new Map();
    silhouettes.set(img, byScale);
  }
  // Even a picture that would not bake is remembered, or every shadow would make a canvas and throw it away.
  const cached = byScale.get(step);
  if (cached !== undefined) return cached;

  const bake = (): Silhouette | null => {
    if (typeof document === 'undefined') return null;
    const blur = SHADOW_BLUR_PX / Math.pow(BAKE_SCALE_STEP, step);
    const pad = Math.ceil(blur * 3);
    const canvas = document.createElement('canvas');
    canvas.width = iw + pad * 2;
    canvas.height = ih + pad * 2;
    const baker = canvas.getContext('2d');
    if (!baker || typeof baker.drawImage !== 'function') return null;
    baker.filter = `brightness(0) blur(${blur}px)`;
    baker.drawImage(img, pad, pad);
    return { canvas, pad };
  };

  const baked = bake();
  byScale.set(step, baked);
  return baked;
}

function drawShadowImage(ctx: CanvasRenderingContext2D, shadow: ShadowShape, img: CanvasImageSource): void {
  const ux = shadow.fx - shadow.x;
  const uy = shadow.fy - shadow.y;
  const len = Math.hypot(ux, uy);
  if (len < 1) return;
  const iw = (img as { width?: number }).width || 1;
  const ih = (img as { height?: number }).height || 1;
  const px = -uy / len;
  const py = ux / len;
  const w = shadow.width;
  const baked = silhouetteOf(img, iw, ih, Math.sqrt((w / iw) * (len / ih)));

  ctx.save();
  const clipped = clipToPolygon(ctx, shadow.clipPolygon);
  ctx.globalAlpha = 0.7;
  if (!baked) ctx.filter = SHADOW_FILTER;
  // Laid onto what is already in force rather than in place of it, so the margin the surface
  // is drawn from and the scale it is drawn at both still hold.
  ctx.transform(
    (px * w) / iw,
    (py * w) / iw,
    (shadow.x - shadow.fx) / ih,
    (shadow.y - shadow.fy) / ih,
    shadow.fx - (px * w) / 2,
    shadow.fy - (py * w) / 2
  );
  if (baked) ctx.drawImage(baked.canvas, -baked.pad, -baked.pad);
  else ctx.drawImage(img, 0, 0);
  // The clip is saved separately; restoring only once would leave it on the next picture.
  if (clipped) ctx.restore();
  ctx.restore();
}

/** Whether a light is one of the ones that moves, and so has to be drawn again each pass. */
function isAnimated(shape: OverlayShape): boolean {
  return !!shape.animation && shape.animation !== 'none';
}

/**
 * How many pixels an overlay is allowed to hold, and how far its resolution may be let
 * down to stay inside that.
 *
 * The overlay covers the whole board plus the spill of the widest light, so on a
 * hundred-cell table it comes to six and a half thousand pixels square — forty-three
 * million of them, a hundred and seventy megabytes, and two more surfaces the same size
 * again once a light flickers. Firefox gives up on a canvas long before Chrome does, and
 * a browser that will not hold one in graphics memory draws it by hand instead.
 *
 * What the overlay draws is darkness and soft gradients, which is the one thing that
 * survives being drawn smaller and stretched back up. So a board past the budget is drawn
 * at less than a pixel each and let up to size by the browser, and never at less than
 * half, past which the edges of a hex would start to show it.
 */
export const OVERLAY_PIXEL_BUDGET = 12_000_000;
export const MIN_OVERLAY_SCALE = 0.5;

export function overlayScale(width: number, height: number, budget = OVERLAY_PIXEL_BUDGET): number {
  const pixels = width * height;
  if (!(pixels > budget)) return 1;
  return Math.max(MIN_OVERLAY_SCALE, Math.sqrt(budget / pixels));
}

export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The ground the lights that move cover, and nothing else.
 *
 * A board is mostly still. One candle guttering in a corner used to mean clearing the whole
 * board and laying the whole of it down again twenty times a second, which on a large table
 * is tens of millions of pixels a frame for the sake of a few hundred thousand. Kept to the
 * box the moving lights actually reach, the rest of the board is left where it is.
 */
export function animatedGlowBounds(
  plan: OverlayPlan,
  widthPx: number,
  heightPx: number,
  margin = 0,
  surface?: OverlaySurface
): DirtyRect | null {
  const resolved = resolvedSurfaceOf(widthPx, heightPx, surface);
  const offsetX = margin - resolved.originX;
  const offsetY = margin - resolved.originY;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const shape of plan.glows) {
    if (!isAnimated(shape) || shape.dimPx <= 0) continue;
    left = Math.min(left, shape.x - shape.dimPx + offsetX);
    top = Math.min(top, shape.y - shape.dimPx + offsetY);
    right = Math.max(right, shape.x + shape.dimPx + offsetX);
    bottom = Math.max(bottom, shape.y + shape.dimPx + offsetY);
  }
  if (!(right > left) || !(bottom > top)) return null;

  const width = widthPx + 2 * margin;
  const height = heightPx + 2 * margin;
  const x = Math.max(0, Math.floor(left));
  const y = Math.max(0, Math.floor(top));
  const w = Math.min(width, Math.ceil(right)) - x;
  const h = Math.min(height, Math.ceil(bottom)) - y;
  return w > 0 && h > 0 ? { x, y, width: w, height: h } : null;
}

/** The baked surfaces, holding what does not change over time. */
export interface OverlayBake {
  /** The darkness, with what can be seen cut out of it, and the lights that stay put. */
  base: BakeCanvas;
  /** The shadows, kept apart from the darkness because they go over the lights. */
  shadows: BakeCanvas | null;
  width: number;
  height: number;
  /** How many canvas pixels went to one overlay pixel when it was drawn. */
  scale: number;
}

interface BakeCanvas {
  image: CanvasImageSource;
  context: CanvasRenderingContext2D;
}

function bakeCanvas(width: number, height: number, scale: number, previous?: BakeCanvas | null): BakeCanvas | null {
  if (previous) {
    reset(previous.context, scale);
    previous.context.globalCompositeOperation = 'source-over';
    previous.context.globalAlpha = 1;
    previous.context.clearRect(0, 0, width, height);
    return previous;
  }
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const context = canvas.getContext('2d');
  if (!context || typeof context.drawImage !== 'function') return null;
  reset(context, scale);
  return { image: canvas, context };
}

/**
 * Back to overlay coordinates, whatever the surface is really made of. Everything below
 * works in the pixels of the board rather than the pixels of the canvas, so a canvas drawn
 * smaller than the board it stands for needs saying only here.
 */
function reset(ctx: CanvasRenderingContext2D, scale: number): void {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

/**
 * Bakes the part that does not change over time.
 *
 * A table with a flickering light redraws the same picture over and over, when only the
 * brightness changes. The darkness goes in, and so do the lights that stay put — a lamp
 * that is not guttering has no business being laid down again every pass, and on a board
 * with several of them that is most of the work.
 */
export function bakeOverlayPlan(
  plan: OverlayPlan,
  widthPx: number,
  heightPx: number,
  images?: Map<string, HTMLImageElement>,
  margin = 0,
  surface?: OverlaySurface,
  previous?: OverlayBake | null,
  scale = 1
): OverlayBake | null {
  const width = widthPx + 2 * margin;
  const height = heightPx + 2 * margin;
  if (width < 1 || height < 1) return null;

  const reuse =
    previous && previous.width === width && previous.height === height && previous.scale === scale ? previous : null;
  const base = bakeCanvas(width, height, scale, reuse?.base);
  if (!base) return null;

  const resolved = resolvedSurfaceOf(widthPx, heightPx, surface);
  const offsetX = margin - resolved.originX;
  const offsetY = margin - resolved.originY;

  base.context.translate(offsetX, offsetY);
  paintDarkness(base.context, plan, resolved);

  base.context.globalCompositeOperation = 'lighter';
  for (const shape of plan.glows) if (!isAnimated(shape)) drawGlow(base.context, shape, 0);
  base.context.globalCompositeOperation = 'source-over';

  let shadows: BakeCanvas | null = null;
  if (plan.shadows.length > 0) {
    shadows = bakeCanvas(width, height, scale, reuse?.shadows);
    if (shadows) {
      shadows.context.translate(offsetX, offsetY);
      paintShadows(shadows.context, plan, images);
      reset(shadows.context, scale);
    }
  }

  reset(base.context, scale);
  return { base, shadows, width, height, scale };
}

function resolvedSurfaceOf(widthPx: number, heightPx: number, surface?: OverlaySurface): ResolvedSurface {
  return {
    originX: surface?.originX ?? 0,
    originY: surface?.originY ?? 0,
    widthPx,
    heightPx,
    cells: surface?.cells,
  };
}

function paintDarkness(ctx: CanvasRenderingContext2D, plan: OverlayPlan, resolved: ResolvedSurface): void {
  if (!(plan.darknessAlpha > 0)) return;

  ctx.globalAlpha = plan.darknessAlpha;
  ctx.fillStyle = plan.darknessColor;
  fillSurface(ctx, resolved);
  ctx.globalAlpha = 1;

  ctx.globalCompositeOperation = 'destination-out';
  if (plan.baseRevealAlpha > 0) {
    ctx.globalAlpha = plan.baseRevealAlpha;
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    fillSurface(ctx, resolved);
    ctx.globalAlpha = 1;
  }
  const cells = plan.revealCells;
  if (cells && cells.length > 0) {
    carveCells(ctx, cells);
  } else {
    for (const shape of plan.reveals) carveReveal(ctx, shape);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function paintShadows(
  ctx: CanvasRenderingContext2D,
  plan: OverlayPlan,
  images: Map<string, HTMLImageElement> | undefined
): void {
  ctx.globalCompositeOperation = 'source-over';
  for (const shadow of plan.shadows) {
    const img = shadow.imageUrl && images ? images.get(shadow.imageUrl) : undefined;
    if (img && img.complete && img.naturalWidth > 0) {
      drawShadowImage(ctx, shadow, img);
    } else {
      drawShadow(ctx, shadow);
    }
  }
}

export function drawOverlayPlan(
  ctx: CanvasRenderingContext2D,
  plan: OverlayPlan,
  widthPx: number,
  heightPx: number,
  timeMs = 0,
  images?: Map<string, HTMLImageElement>,
  margin = 0,
  surface?: OverlaySurface,
  bake?: OverlayBake | null,
  dirty?: DirtyRect | null,
  scale = 1
): void {
  const resolved = resolvedSurfaceOf(widthPx, heightPx, surface);
  const offsetX = margin - resolved.originX;
  const offsetY = margin - resolved.originY;
  const width = widthPx + 2 * margin;
  const height = heightPx + 2 * margin;

  const usable = bake && bake.width === width && bake.height === height && bake.scale === scale ? bake : null;
  // Only a pass that has the still part already laid down may keep to a corner of the board.
  const patch = usable && dirty ? dirty : null;

  reset(ctx, scale);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  if (patch) ctx.clearRect(patch.x, patch.y, patch.width, patch.height);
  else ctx.clearRect(0, 0, width, height);

  if (usable) blit(ctx, usable.base.image, patch, width, height, scale);

  ctx.translate(offsetX, offsetY);
  if (!usable) paintDarkness(ctx, plan, resolved);

  ctx.globalCompositeOperation = 'lighter';
  // A light that stays put is already in the baked surface, so drawing it again would
  // only add it to itself.
  for (const shape of plan.glows) if (!usable || isAnimated(shape)) drawGlow(ctx, shape, timeMs);

  ctx.globalCompositeOperation = 'source-over';
  if (usable) {
    if (usable.shadows) {
      reset(ctx, scale);
      blit(ctx, usable.shadows.image, patch, width, height, scale);
    }
  } else {
    paintShadows(ctx, plan, images);
  }

  ctx.globalAlpha = 1;
  reset(ctx, scale);
}

/**
 * Lays a baked surface down, either whole or only over the part being redrawn.
 *
 * The surface holds canvas pixels and is being laid onto overlay coordinates, so where it
 * is taken from is measured one way and where it lands the other.
 */
function blit(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  patch: DirtyRect | null,
  width: number,
  height: number,
  scale: number
): void {
  if (!patch) {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }
  ctx.drawImage(
    image,
    patch.x * scale,
    patch.y * scale,
    patch.width * scale,
    patch.height * scale,
    patch.x,
    patch.y,
    patch.width,
    patch.height
  );
}
