import {
  ClipAreaDiamond,
  ClipAreaHexagon,
  ClipAreaLine,
  ClipAreaPentagon,
  ClipAreaSquare,
  ClipAreaTriangle,
  RangeRenderSetting,
} from '@axe/features/tabletop/range/range-render-types';
import {
  calcGridOffsets,
  chkOuterProduct,
  fillGridCells,
  makeBrush,
} from '@axe/features/tabletop/range/range-render-util';

export function renderLine(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaLine {
  const offsets = calcGridOffsets(setting);
  const { gridSize, offSetX_px, offSetY_px } = offsets;

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context: CanvasRenderingContext2D = canvasElement.getContext('2d')!;

  const p1x_ = 0;
  const p1y_ = 0.5 * setting.width * gridSize;
  const p2x_ = 0;
  const p2y_ = -0.5 * setting.width * gridSize;
  const p3x_ = setting.range * gridSize;
  const p3y_ = -0.5 * setting.width * gridSize;
  const p4x_ = setting.range * gridSize;
  const p4y_ = 0.5 * setting.width * gridSize;

  // クリッピング座標（コーンの根本から時計回りにクリップ範囲を定義）
  const clip01x_ = p1x_ - gridSize * 1.0;
  const clip01y_ = p1y_ + gridSize * 1.0;
  const clip02x_ = p2x_ - gridSize * 1.0;
  const clip02y_ = p2y_ - gridSize * 1.0;
  const clip03x_ = p3x_ + gridSize * 1.0;
  const clip03y_ = p3y_ - gridSize * 1.0;
  const clip04x_ = p4x_ + gridSize * 1.0;
  const clip04y_ = p4y_ + gridSize * 1.0;

  const rad = (Math.PI / 180) * setting.degree;
  const p1x = p1x_ * Math.cos(rad) - p1y_ * Math.sin(rad);
  const p1y = p1x_ * Math.sin(rad) + p1y_ * Math.cos(rad);
  const p2x = p2x_ * Math.cos(rad) - p2y_ * Math.sin(rad);
  const p2y = p2x_ * Math.sin(rad) + p2y_ * Math.cos(rad);
  const p3x = p3x_ * Math.cos(rad) - p3y_ * Math.sin(rad);
  const p3y = p3x_ * Math.sin(rad) + p3y_ * Math.cos(rad);
  const p4x = p4x_ * Math.cos(rad) - p4y_ * Math.sin(rad);
  const p4y = p4x_ * Math.sin(rad) + p4y_ * Math.cos(rad);

  const clip: ClipAreaLine = {
    clip01x: clip01x_ * Math.cos(rad) - clip01y_ * Math.sin(rad), // 根本始点
    clip01y: clip01x_ * Math.sin(rad) + clip01y_ * Math.cos(rad),
    clip02x: clip02x_ * Math.cos(rad) - clip02y_ * Math.sin(rad),
    clip02y: clip02x_ * Math.sin(rad) + clip02y_ * Math.cos(rad),
    clip03x: clip03x_ * Math.cos(rad) - clip03y_ * Math.sin(rad),
    clip03y: clip03x_ * Math.sin(rad) + clip03y_ * Math.cos(rad),
    clip04x: clip04x_ * Math.cos(rad) - clip04y_ * Math.sin(rad),
    clip04y: clip04x_ * Math.sin(rad) + clip04y_ * Math.cos(rad),
  };

  makeBrush(context, gridSize, setting.gridColor);

  if (setting.fillOutLine) {
    context.beginPath();
    context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
    context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
    context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
    context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
    context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
    context.fill();
  } else {
    fillGridCells(
      context,
      setting,
      offsets,
      (gcx, gcy) =>
        chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
        chkOuterProduct(p2x, p2y, p3x, p3y, gcx, gcy) &&
        chkOuterProduct(p3x, p3y, p4x, p4y, gcx, gcy) &&
        chkOuterProduct(p4x, p4y, p1x, p1y, gcx, gcy)
    );
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;

  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
  context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
  context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
  context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
  context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
  context.stroke();

  context.beginPath();
  context.arc(offSetX_px, offSetX_px, 5, 0, 2 * Math.PI, true);
  context.fill();

  return clip;
}

export function renderSquare(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaSquare {
  const offsets = calcGridOffsets(setting);
  const { gridSize, offSetX_px, offSetY_px } = offsets;

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context: CanvasRenderingContext2D = canvasElement.getContext('2d')!;

  const p1x = -setting.range * gridSize; // 左下
  const p1y = setting.range * gridSize;
  const p2x = -setting.range * gridSize; // 左上
  const p2y = -setting.range * gridSize;
  const p3x = setting.range * gridSize; // 右上
  const p3y = -setting.range * gridSize;
  const p4x = setting.range * gridSize; // 右下
  const p4y = setting.range * gridSize;

  // クリッピング座標（根本から時計回りにクリップ範囲を定義）
  const clip: ClipAreaSquare = {
    clip01x: p1x - gridSize * 1.0, // 根本始点
    clip01y: p1y + gridSize * 1.0,
    clip02x: p2x - gridSize * 1.0,
    clip02y: p2y - gridSize * 1.0,
    clip03x: p3x + gridSize * 1.0,
    clip03y: p3y - gridSize * 1.0,
    clip04x: p4x + gridSize * 1.0,
    clip04y: p4y + gridSize * 1.0,
  };

  makeBrush(context, gridSize, setting.gridColor);

  if (setting.fillOutLine) {
    context.beginPath();
    context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
    context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
    context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
    context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
    context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
    context.fill();
  } else {
    const halfRange = setting.range * gridSize;
    fillGridCells(
      context,
      setting,
      offsets,
      (gcx, gcy) => gcx >= -halfRange && gcx <= halfRange && gcy >= -halfRange && gcy <= halfRange
    );
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;

  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
  context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
  context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
  context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
  context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
  context.stroke();

  if (setting.isDocking) {
    context.beginPath();
    context.strokeRect(offSetX_px - 6, offSetY_px - 6, 12, 12);
  } else {
    context.beginPath();
    context.arc(offSetX_px, offSetX_px, 5, 0, 2 * Math.PI, true);
    context.fill();
  }

  return clip;
}

export function renderDiamond(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaDiamond {
  const offsets = calcGridOffsets(setting);
  const { gridSize, offSetX_px, offSetY_px } = offsets;

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context: CanvasRenderingContext2D = canvasElement.getContext('2d')!;

  const p1x = -setting.range * gridSize; // 左
  const p1y = 0;
  const p2x = 0; // 上
  const p2y = -setting.range * gridSize;
  const p3x = setting.range * gridSize; // 右
  const p3y = 0;
  const p4x = 0; // 下
  const p4y = setting.range * gridSize;

  // クリッピング座標（根本から時計回りにクリップ範囲を定義）
  const clip: ClipAreaDiamond = {
    clip01x: p1x - gridSize * 1.2, // 根本始点
    clip01y: 0,
    clip02x: 0,
    clip02y: p2y - gridSize * 1.2,
    clip03x: p3x + gridSize * 1.2,
    clip03y: 0,
    clip04x: 0,
    clip04y: p4y + gridSize * 1.2,
  };

  makeBrush(context, gridSize, setting.gridColor);

  if (setting.fillOutLine) {
    context.beginPath();
    context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
    context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
    context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
    context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
    context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
    context.fill();
  } else {
    const halfRange = setting.range * gridSize;
    fillGridCells(context, setting, offsets, (gcx, gcy) => Math.abs(gcx) + Math.abs(gcy) <= halfRange);
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;

  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
  context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
  context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
  context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
  context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
  context.stroke();

  if (setting.isDocking) {
    context.beginPath();
    context.strokeRect(offSetX_px - 6, offSetY_px - 6, 12, 12);
  } else {
    context.beginPath();
    context.arc(offSetX_px, offSetX_px, 5, 0, 2 * Math.PI, true);
    context.fill();
  }

  return clip;
}

// ---- ヘルパー: 正多角形の頂点を生成 (中心0,0・上方向が最初の頂点) ----
function regularPolygonVertices(n: number, radius: number): { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (((360 / n) * i - 90) * Math.PI) / 180;
    verts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return verts;
}

// ---- 凸多角形の内側判定 ----
function insideConvexPolygon(verts: { x: number; y: number }[], gcx: number, gcy: number): boolean {
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    if (!chkOuterProduct(a.x, a.y, b.x, b.y, gcx, gcy)) return false;
  }
  return true;
}

// ---- TRIANGLE: キャラ中心に置いた正三角形 ----
export function renderTriangle(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaTriangle {
  const offsets = calcGridOffsets(setting);
  const { gridSize, offSetX_px, offSetY_px } = offsets;

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context = canvasElement.getContext('2d')!;

  const r = setting.range * gridSize;
  const verts = regularPolygonVertices(3, r);

  const clip: ClipAreaTriangle = {
    clip01x: verts[0].x * 1.2,
    clip01y: verts[0].y * 1.2,
    clip02x: verts[1].x * 1.2,
    clip02y: verts[1].y * 1.2,
    clip03x: verts[2].x * 1.2,
    clip03y: verts[2].y * 1.2,
  };

  makeBrush(context, gridSize, setting.gridColor);
  if (setting.fillOutLine) {
    context.beginPath();
    context.moveTo(verts[0].x + offSetX_px, verts[0].y + offSetY_px);
    for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x + offSetX_px, verts[i].y + offSetY_px);
    context.closePath();
    context.fill();
  } else {
    fillGridCells(context, setting, offsets, (gcx, gcy) => insideConvexPolygon(verts, gcx, gcy));
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;
  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(verts[0].x + offSetX_px, verts[0].y + offSetY_px);
  for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x + offSetX_px, verts[i].y + offSetY_px);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(offSetX_px, offSetY_px, 5, 0, 2 * Math.PI, true);
  context.fill();

  return clip;
}

// ---- PENTAGON: キャスター中心の正五角形 ----
export function renderPentagon(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaPentagon {
  const offsets = calcGridOffsets(setting);
  const { gridSize, offSetX_px, offSetY_px } = offsets;

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context = canvasElement.getContext('2d')!;

  const r = setting.range * gridSize;
  const verts = regularPolygonVertices(5, r);

  const clip: ClipAreaPentagon = {
    clip01x: verts[0].x * 1.2,
    clip01y: verts[0].y * 1.2,
    clip02x: verts[1].x * 1.2,
    clip02y: verts[1].y * 1.2,
    clip03x: verts[2].x * 1.2,
    clip03y: verts[2].y * 1.2,
    clip04x: verts[3].x * 1.2,
    clip04y: verts[3].y * 1.2,
    clip05x: verts[4].x * 1.2,
    clip05y: verts[4].y * 1.2,
  };

  makeBrush(context, gridSize, setting.gridColor);
  if (setting.fillOutLine) {
    context.beginPath();
    context.moveTo(verts[0].x + offSetX_px, verts[0].y + offSetY_px);
    for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x + offSetX_px, verts[i].y + offSetY_px);
    context.closePath();
    context.fill();
  } else {
    fillGridCells(context, setting, offsets, (gcx, gcy) => insideConvexPolygon(verts, gcx, gcy));
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;
  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(verts[0].x + offSetX_px, verts[0].y + offSetY_px);
  for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x + offSetX_px, verts[i].y + offSetY_px);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(offSetX_px, offSetY_px, 5, 0, 2 * Math.PI, true);
  context.fill();

  return clip;
}

// ---- HEXAGON: キャスター中心の正六角形 ----
export function renderHexagon(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaHexagon {
  const offsets = calcGridOffsets(setting);
  const { gridSize, offSetX_px, offSetY_px } = offsets;

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context = canvasElement.getContext('2d')!;

  const r = setting.range * gridSize;
  const verts = regularPolygonVertices(6, r);

  const clip: ClipAreaHexagon = {
    clip01x: verts[0].x * 1.2,
    clip01y: verts[0].y * 1.2,
    clip02x: verts[1].x * 1.2,
    clip02y: verts[1].y * 1.2,
    clip03x: verts[2].x * 1.2,
    clip03y: verts[2].y * 1.2,
    clip04x: verts[3].x * 1.2,
    clip04y: verts[3].y * 1.2,
    clip05x: verts[4].x * 1.2,
    clip05y: verts[4].y * 1.2,
    clip06x: verts[5].x * 1.2,
    clip06y: verts[5].y * 1.2,
  };

  makeBrush(context, gridSize, setting.gridColor);
  if (setting.fillOutLine) {
    context.beginPath();
    context.moveTo(verts[0].x + offSetX_px, verts[0].y + offSetY_px);
    for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x + offSetX_px, verts[i].y + offSetY_px);
    context.closePath();
    context.fill();
  } else {
    fillGridCells(context, setting, offsets, (gcx, gcy) => insideConvexPolygon(verts, gcx, gcy));
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;
  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(verts[0].x + offSetX_px, verts[0].y + offSetY_px);
  for (let i = 1; i < verts.length; i++) context.lineTo(verts[i].x + offSetX_px, verts[i].y + offSetY_px);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(offSetX_px, offSetY_px, 5, 0, 2 * Math.PI, true);
  context.fill();

  return clip;
}
