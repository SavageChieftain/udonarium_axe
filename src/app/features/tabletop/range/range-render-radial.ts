import { ClipAreaCorn, RangeRenderSetting } from './range-render-types';
import {
  calcGridOffsets,
  chkInCircle,
  chkOuterProduct,
  fillSquare,
  generateCalcGridPositionFunc,
  makeBrush,
} from './range-render-util';

export function renderCircle(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): void {
  const { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px } = calcGridOffsets(setting);

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context: CanvasRenderingContext2D = canvasElement.getContext('2d')!;

  const calcGridPosition = generateCalcGridPositionFunc(
    setting.gridType,
    setting.centerX,
    setting.centerY,
    setting.areaWidth,
    setting.areaHeight,
    gridSize
  );

  if (setting.fillOutLine) {
    makeBrush(context, gridSize, setting.gridColor);
    context.beginPath();
    context.arc(offSetX_px, offSetY_px, setting.range * gridSize, 0, 2 * Math.PI, true);
    context.fill();
  } else {
    makeBrush(context, gridSize, setting.gridColor);
    for (let h = 0; h <= setting.areaHeight + 1; h++) {
      for (let w = 0; w <= setting.areaWidth + 1; w++) {
        const { gx, gy } = calcGridPosition(w, h);
        const gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
        const gcy = gy + gridOffY + gridSize / 2 - offSetY_px;
        if (chkInCircle(setting.range * gridSize, gcx, gcy)) {
          fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
        }
      }
    }
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;

  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.arc(offSetX_px, offSetY_px, setting.range * gridSize, 0, 2 * Math.PI, true);
  context.stroke();

  if (setting.isDocking) {
    context.beginPath();
    context.strokeRect(offSetX_px - 6, offSetY_px - 6, 12, 12);
  } else {
    context.beginPath();
    context.arc(offSetX_px, offSetX_px, 5, 0, 2 * Math.PI, true);
    context.fill();
  }
}

export function renderCorn(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaCorn {
  const { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px } = calcGridOffsets(setting);

  canvasElement.width = setting.areaWidth * gridSize;
  canvasElement.height = setting.areaHeight * gridSize;
  let context: CanvasRenderingContext2D = canvasElement.getContext('2d')!;

  const cx_ = 0.0;
  const cy_ = 0.0;
  const p1x_ = setting.range * gridSize;
  const p1y_ = -0.5 * setting.width * gridSize;
  const p2x_ = setting.range * gridSize;
  const p2y_ = 0.5 * setting.width * gridSize;

  // クリッピング座標（コーンの根本から時計回りにクリップ範囲を定義）
  const clip01x_ = cx_ - gridSize * 1.5;
  const clip01y_ = cy_;
  const clip02x_ = cx_ - gridSize * 1.0;
  const clip02y_ = cy_ - gridSize * 1.0;
  const clip03x_ = p1x_ - gridSize * 1.0;
  const clip03y_ = p1y_ - gridSize * 1.0;
  const clip04x_ = p1x_;
  const clip04y_ = p1y_ - gridSize * 1.0;
  const clip05x_ = p1x_ + gridSize * 1.0;
  const clip05y_ = p1y_ - gridSize * 1.0;
  const clip06x_ = clip05x_;
  const clip06y_ = -clip05y_;
  const clip07x_ = clip04x_;
  const clip07y_ = -clip04y_;
  const clip08x_ = clip03x_;
  const clip08y_ = -clip03y_;
  const clip09x_ = clip02x_;
  const clip09y_ = -clip02y_;

  const rad = (Math.PI / 180) * setting.degree;
  const cx = cx_;
  const cy = cy_;
  const p1x = p1x_ * Math.cos(rad) - p1y_ * Math.sin(rad);
  const p1y = p1x_ * Math.sin(rad) + p1y_ * Math.cos(rad);
  const p2x = p2x_ * Math.cos(rad) - p2y_ * Math.sin(rad);
  const p2y = p2x_ * Math.sin(rad) + p2y_ * Math.cos(rad);

  const clip: ClipAreaCorn = {
    clip01x: clip01x_ * Math.cos(rad) - clip01y_ * Math.sin(rad), // 根本始点
    clip01y: clip01x_ * Math.sin(rad) + clip01y_ * Math.cos(rad),
    clip02x: clip02x_ * Math.cos(rad) - clip02y_ * Math.sin(rad),
    clip02y: clip02x_ * Math.sin(rad) + clip02y_ * Math.cos(rad),
    clip03x: clip03x_ * Math.cos(rad) - clip03y_ * Math.sin(rad),
    clip03y: clip03x_ * Math.sin(rad) + clip03y_ * Math.cos(rad),
    clip04x: clip04x_ * Math.cos(rad) - clip04y_ * Math.sin(rad),
    clip04y: clip04x_ * Math.sin(rad) + clip04y_ * Math.cos(rad),
    clip05x: clip05x_ * Math.cos(rad) - clip05y_ * Math.sin(rad), // 先端部
    clip05y: clip05x_ * Math.sin(rad) + clip05y_ * Math.cos(rad),
    clip06x: clip06x_ * Math.cos(rad) - clip06y_ * Math.sin(rad), // 折り返し
    clip06y: clip06x_ * Math.sin(rad) + clip06y_ * Math.cos(rad),
    clip07x: clip07x_ * Math.cos(rad) - clip07y_ * Math.sin(rad),
    clip07y: clip07x_ * Math.sin(rad) + clip07y_ * Math.cos(rad),
    clip08x: clip08x_ * Math.cos(rad) - clip08y_ * Math.sin(rad),
    clip08y: clip08x_ * Math.sin(rad) + clip08y_ * Math.cos(rad),
    clip09x: clip09x_ * Math.cos(rad) - clip09y_ * Math.sin(rad),
    clip09y: clip09x_ * Math.sin(rad) + clip09y_ * Math.cos(rad),
  };

  const calcGridPosition = generateCalcGridPositionFunc(
    setting.gridType,
    setting.centerX,
    setting.centerY,
    setting.areaWidth,
    setting.areaHeight,
    gridSize
  );

  if (setting.fillOutLine) {
    makeBrush(context, gridSize, setting.gridColor);
    context.beginPath();
    context.moveTo(cx + offSetX_px, cy + offSetY_px);
    context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
    context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
    context.lineTo(cx + offSetX_px, cy + offSetY_px);
    context.fill();
  } else {
    makeBrush(context, gridSize, setting.gridColor);
    for (let h = 0; h <= setting.areaHeight + 1; h++) {
      for (let w = 0; w <= setting.areaWidth + 1; w++) {
        const { gx, gy } = calcGridPosition(w, h);
        const gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
        const gcy = gy + gridOffY + gridSize / 2 - offSetY_px;
        if (
          chkOuterProduct(cx, cy, p1x, p1y, gcx, gcy) &&
          chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
          chkOuterProduct(p2x, p2y, cx, cy, gcx, gcy)
        ) {
          fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
        }
      }
    }
  }

  canvasElementRange.width = setting.areaWidth * gridSize;
  canvasElementRange.height = setting.areaHeight * gridSize;
  context = canvasElementRange.getContext('2d')!;

  makeBrush(context, gridSize, setting.rangeColor);
  context.beginPath();
  context.lineWidth = 2;
  context.moveTo(cx + offSetX_px, cy + offSetY_px);
  context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
  context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
  context.lineTo(cx + offSetX_px, cy + offSetY_px);
  context.stroke();

  context.beginPath();
  context.arc(offSetX_px, offSetX_px, 5, 0, 2 * Math.PI, true);
  context.fill();

  return clip;
}
