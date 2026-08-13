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
/** 焼く倍率のきざみ。細かく分けるほど焼き直しが増え、粗いほど縁の柔らかさがずれる。 */
const BAKE_SCALE_STEP = 1.5;

/**
 * 影のもとになる黒い切り抜き。
 *
 * 影の数は「光源 × 遮る物」で増える。ぼかしを毎フレーム掛け直すと、その数だけ
 * 再ラスタライズが走って 1 フレームが数百 ms に伸びる。絵と倍率ごとに 1 度だけ焼く。
 *
 * 焼いた絵は縮めて置くので、焼くときのぼかしは縮むぶんだけ広げておく。倍率を
 * 見ずに一定量で焼くと、大きな絵ほど縁が硬くなる。
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
  // 焼けなかった絵も覚えておく。覚えないと影 1 枚ごとに canvas を作っては捨てる。
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

function drawShadowImage(
  ctx: CanvasRenderingContext2D,
  shadow: ShadowShape,
  img: CanvasImageSource,
  offsetX = 0,
  offsetY = 0
): void {
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
  // 置き方は焼く前と同じ。焼いた絵は余白ぶん外から描いて、元の位置に重ねる。
  ctx.setTransform(
    (px * w) / iw,
    (py * w) / iw,
    (shadow.x - shadow.fx) / ih,
    (shadow.y - shadow.fy) / ih,
    shadow.fx - (px * w) / 2 + offsetX,
    shadow.fy - (py * w) / 2 + offsetY
  );
  if (baked) ctx.drawImage(baked.canvas, -baked.pad, -baked.pad);
  else ctx.drawImage(img, 0, 0);
  // clipToPolygon も自前で退避する。1 回しか戻さないと切り抜きが次の絵に残る。
  if (clipped) ctx.restore();
  ctx.restore();
}

export function drawOverlayPlan(
  ctx: CanvasRenderingContext2D,
  plan: OverlayPlan,
  widthPx: number,
  heightPx: number,
  timeMs = 0,
  images?: Map<string, HTMLImageElement>,
  margin = 0,
  surface?: OverlaySurface
): void {
  const resolved: ResolvedSurface = {
    originX: surface?.originX ?? 0,
    originY: surface?.originY ?? 0,
    widthPx,
    heightPx,
    cells: surface?.cells,
  };
  const offsetX = margin - resolved.originX;
  const offsetY = margin - resolved.originY;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, widthPx + 2 * margin, heightPx + 2 * margin);
  ctx.translate(offsetX, offsetY);

  if (plan.darknessAlpha > 0) {
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
  }

  ctx.globalCompositeOperation = 'lighter';
  for (const shape of plan.glows) drawGlow(ctx, shape, timeMs);

  ctx.globalCompositeOperation = 'source-over';
  for (const shadow of plan.shadows) {
    const img = shadow.imageUrl && images ? images.get(shadow.imageUrl) : undefined;
    if (img && img.complete && img.naturalWidth > 0) {
      drawShadowImage(ctx, shadow, img, offsetX, offsetY);
    } else {
      drawShadow(ctx, shadow);
    }
  }

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
