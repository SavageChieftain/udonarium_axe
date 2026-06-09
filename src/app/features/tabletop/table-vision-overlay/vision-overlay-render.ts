import { OverlayPlan, OverlayShape, ShadowShape } from '@axe/domain/tabletop/vision-scene';

const TWO_PI = Math.PI * 2;

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

function drawShadowImage(ctx: CanvasRenderingContext2D, shadow: ShadowShape, img: CanvasImageSource, margin = 0): void {
  const ux = shadow.fx - shadow.x;
  const uy = shadow.fy - shadow.y;
  const len = Math.hypot(ux, uy);
  if (len < 1) return;
  const iw = (img as { width?: number }).width || 1;
  const ih = (img as { height?: number }).height || 1;
  const px = -uy / len;
  const py = ux / len;
  const w = shadow.width;
  ctx.save();
  clipToPolygon(ctx, shadow.clipPolygon);
  ctx.globalAlpha = 0.7;
  ctx.filter = 'brightness(0) blur(3px)';
  ctx.setTransform(
    (px * w) / iw,
    (py * w) / iw,
    (shadow.x - shadow.fx) / ih,
    (shadow.y - shadow.fy) / ih,
    shadow.fx - (px * w) / 2 + margin,
    shadow.fy - (py * w) / 2 + margin
  );
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export function drawOverlayPlan(
  ctx: CanvasRenderingContext2D,
  plan: OverlayPlan,
  widthPx: number,
  heightPx: number,
  timeMs = 0,
  images?: Map<string, HTMLImageElement>,
  margin = 0
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, widthPx + 2 * margin, heightPx + 2 * margin);
  ctx.translate(margin, margin);

  if (plan.darknessAlpha > 0) {
    ctx.globalAlpha = plan.darknessAlpha;
    ctx.fillStyle = plan.darknessColor;
    ctx.fillRect(0, 0, widthPx, heightPx);
    ctx.globalAlpha = 1;

    ctx.globalCompositeOperation = 'destination-out';
    if (plan.baseRevealAlpha > 0) {
      ctx.globalAlpha = plan.baseRevealAlpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.globalAlpha = 1;
    }
    for (const shape of plan.reveals) carveReveal(ctx, shape);
  }

  ctx.globalCompositeOperation = 'lighter';
  for (const shape of plan.glows) drawGlow(ctx, shape, timeMs);

  ctx.globalCompositeOperation = 'source-over';
  for (const shadow of plan.shadows) {
    const img = shadow.imageUrl && images ? images.get(shadow.imageUrl) : undefined;
    if (img && img.complete && img.naturalWidth > 0) {
      drawShadowImage(ctx, shadow, img, margin);
    } else {
      drawShadow(ctx, shadow);
    }
  }

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
