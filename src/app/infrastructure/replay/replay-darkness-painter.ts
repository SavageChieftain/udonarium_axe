import type { OverlayPlan, OverlayShape } from '@axe/domain/tabletop/vision-scene';

/**
 * 動画の盤面へ暗闇と灯りを乗せる。
 *
 * 生きている卓は CSS のグラデーションと `clip-path` で同じ絵を作る。canvas には
 * 「切り抜き」が無いので、暗幕を別の面に描いてから灯りの形で削り、削り終えた面を重ねる。
 */

export interface DarknessCanvas {
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  clip(): void;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  translate(x: number, y: number): void;
  rotate(angle: number): void;
  arc(x: number, y: number, radius: number, from: number, to: number): void;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number
  ): { addColorStop(offset: number, color: string): void };
  drawImage(image: CanvasImageSource, x: number, y: number, width: number, height: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern | object;
  globalAlpha: number;
  globalCompositeOperation: string;
  canvas: { width: number; height: number };
}

export interface DarknessPlacement {
  /** 盤面の左上（画面座標）。 */
  left: number;
  top: number;
  /** 卓の大きさ（画面座標）。 */
  width: number;
  height: number;
  /** 卓の座標を画面の長さへ。 */
  onBoard(value: number): number;
}

/** 別の面を作れるか。作れない環境では暗闇を描かない（盤面をそのまま出す）。 */
type LayerFactory = (width: number, height: number) => DarknessCanvas | null;

/**
 * 暗幕を作る面の最大の辺。卓の座標のまま作ると 6000px 四方にもなるので、
 * ここで頭打ちにして、描くときに引き伸ばす。暗闇は輪郭の緩い絵なので粗さは出ない。
 */
export const DARKNESS_LAYER_MAX = 2048;

/**
 * 暗幕を描く面は使い回す。
 *
 * 動画は 1 秒に 30 枚描く。1 枚ごとに 2048 四方の面を作っては捨てると、書き出しの
 * あいだじゅう 16MB の確保と解放をくり返すことになる。大きさが同じなら同じ面を洗って使う。
 */
let scratch: { canvas: OffscreenCanvas; context: DarknessCanvas } | null = null;

export function defaultDarknessLayer(width: number, height: number): DarknessCanvas | null {
  if (width < 1 || height < 1) return null;

  if (typeof OffscreenCanvas !== 'undefined') {
    if (!scratch || scratch.canvas.width !== width || scratch.canvas.height !== height) {
      const canvas = new OffscreenCanvas(width, height);
      const created = canvas.getContext('2d');
      if (!created) return null;
      scratch = { canvas, context: created as unknown as DarknessCanvas };
    } else {
      // 大きさを入れ直すと中身も消える。同じ大きさのときは明示して洗う。
      const reused = scratch.canvas.getContext('2d');
      reused?.clearRect(0, 0, width, height);
    }
    const context = scratch.context;
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    return context;
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return (canvas.getContext('2d') as unknown as DarknessCanvas) ?? null;
  }
  return null;
}

export function paintReplayDarkness(
  ctx: DarknessCanvas,
  plan: OverlayPlan,
  place: DarknessPlacement,
  layerOf: LayerFactory = defaultDarknessLayer
): void {
  const width = Math.round(place.width);
  const height = Math.round(place.height);
  if (width < 1 || height < 1) return;

  // 面の細かさ。描く大きさより粗くてよいので、長辺で頭打ちにする。
  const shrink = Math.min(1, DARKNESS_LAYER_MAX / Math.max(width, height));
  const layerWidth = Math.max(1, Math.round(width * shrink));
  const layerHeight = Math.max(1, Math.round(height * shrink));
  const onLayer = (value: number): number => place.onBoard(value) * shrink;

  const layer = layerOf(layerWidth, layerHeight);
  if (!layer) return;

  // 1. 暗幕。卓の一面を塗り潰す。
  layer.fillStyle = plan.darknessColor;
  layer.globalAlpha = clamp01(plan.darknessAlpha);
  layer.fillRect(0, 0, layerWidth, layerHeight);
  layer.globalAlpha = 1;

  // 2. 見えている所を削る。全体の明るさぶんは最初から薄くしておく。
  layer.globalCompositeOperation = 'destination-out';
  const base = clamp01(plan.baseRevealAlpha);
  if (base > 0) {
    layer.fillStyle = '#000000';
    layer.globalAlpha = base;
    layer.fillRect(0, 0, layerWidth, layerHeight);
    layer.globalAlpha = 1;
  }

  if (plan.revealCells && plan.revealCells.length > 0) {
    // マスに吸わせる設定のときは、灯りの形ではなくマスの形で削る。
    layer.fillStyle = '#000000';
    for (const cell of plan.revealCells) {
      if (cell.length < 3) continue;
      layer.beginPath();
      layer.moveTo(onLayer(cell[0].x), onLayer(cell[0].y));
      for (const point of cell.slice(1)) layer.lineTo(onLayer(point.x), onLayer(point.y));
      layer.closePath();
      layer.fill();
    }
  } else {
    for (const reveal of plan.reveals) eraseShape(layer, reveal, { ...place, onBoard: onLayer });
  }

  layer.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.drawImage(layer.canvas as unknown as CanvasImageSource, place.left, place.top, width, height);

  // 3. 灯りの色。削った所へ薄く重ねて、光っていることを見せる。
  ctx.globalCompositeOperation = 'lighter';
  for (const glow of plan.glows) {
    ctx.save();
    clipToPolygon(ctx, glow, place);
    fillShape(ctx, glow, place, place.left, place.top, 0.35);
    ctx.restore();
  }
  ctx.restore();
}

function eraseShape(layer: DarknessCanvas, shape: OverlayShape, place: DarknessPlacement): void {
  layer.save();
  clipToPolygon(layer, shape, place, true);
  fillShape(layer, shape, place, 0, 0, 1, '#000000');
  layer.restore();
}

/** 灯りの届く形。中心は濃く、`dimPx` の縁で消えるまでの落差を持たせる。 */
function fillShape(
  target: DarknessCanvas,
  shape: OverlayShape,
  place: DarknessPlacement,
  offsetX: number,
  offsetY: number,
  strength: number,
  color = shape.color
): void {
  const x = offsetX + place.onBoard(shape.x);
  const y = offsetY + place.onBoard(shape.y);
  const dim = place.onBoard(Math.max(shape.dimPx, 1));
  const bright = place.onBoard(Math.max(shape.brightPx, 0));

  const gradient = target.createRadialGradient(x, y, 0, x, y, dim);
  const edge = dim > 0 ? Math.min(0.999, Math.max(0, bright / dim)) : 0;
  gradient.addColorStop(0, color);
  if (edge > 0) gradient.addColorStop(edge, color);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  target.globalAlpha = clamp01(strength);
  target.fillStyle = gradient as unknown as CanvasGradient;

  target.beginPath();
  if (shape.angle >= 360) {
    target.arc(x, y, dim, 0, Math.PI * 2);
  } else {
    // 円錐。向きは卓と同じで、真上から見た扇として描く。
    const half = (shape.angle * Math.PI) / 360;
    const facing = (shape.direction * Math.PI) / 180;
    target.moveTo(x, y);
    target.arc(x, y, dim, facing - half, facing + half);
    target.closePath();
  }
  target.fill();
  target.globalAlpha = 1;
}

function clipToPolygon(target: DarknessCanvas, shape: OverlayShape, place: DarknessPlacement, atOrigin = false): void {
  const polygon = shape.clipPolygon;
  if (!polygon || polygon.length < 3) return;

  const offsetX = atOrigin ? 0 : place.left;
  const offsetY = atOrigin ? 0 : place.top;
  target.beginPath();
  target.moveTo(offsetX + place.onBoard(polygon[0].x), offsetY + place.onBoard(polygon[0].y));
  for (const point of polygon.slice(1)) {
    target.lineTo(offsetX + place.onBoard(point.x), offsetY + place.onBoard(point.y));
  }
  target.closePath();
  target.clip();
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
