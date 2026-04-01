import { ClipAreaDiamond, ClipAreaLine, ClipAreaSquare, RangeRenderSetting } from './range-render-types';
import {
  calcGridOffsets,
  chkOuterProduct,
  fillSquare,
  generateCalcGridPositionFunc,
  makeBrush,
} from './range-render-util';

export function renderLine(
  canvasElement: HTMLCanvasElement,
  canvasElementRange: HTMLCanvasElement,
  setting: RangeRenderSetting
): ClipAreaLine {
  const { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px } = calcGridOffsets(setting);

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

  const calcGridPosition = generateCalcGridPositionFunc(
    setting.gridType,
    setting.centerX,
    setting.centerY,
    setting.areaWidth,
    setting.areaHeight,
    gridSize
  );
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
    const adjX = gridOffX + gridSize / 2 - offSetX_px;
    const adjY = gridOffY + gridSize / 2 - offSetY_px;
    for (let h = 0; h <= setting.areaHeight + 1; h++) {
      for (let w = 0; w <= setting.areaWidth + 1; w++) {
        const { gx, gy } = calcGridPosition(w, h);
        const gcx = gx + adjX;
        const gcy = gy + adjY;
        if (
          chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
          chkOuterProduct(p2x, p2y, p3x, p3y, gcx, gcy) &&
          chkOuterProduct(p3x, p3y, p4x, p4y, gcx, gcy) &&
          chkOuterProduct(p4x, p4y, p1x, p1y, gcx, gcy)
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
  const { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px } = calcGridOffsets(setting);

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

  const calcGridPosition = generateCalcGridPositionFunc(
    setting.gridType,
    setting.centerX,
    setting.centerY,
    setting.areaWidth,
    setting.areaHeight,
    gridSize
  );
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
    const adjX = gridOffX + gridSize / 2 - offSetX_px;
    const adjY = gridOffY + gridSize / 2 - offSetY_px;
    const halfRange = setting.range * gridSize;
    for (let h = 0; h <= setting.areaHeight + 1; h++) {
      for (let w = 0; w <= setting.areaWidth + 1; w++) {
        const { gx, gy } = calcGridPosition(w, h);
        const gcx = gx + adjX;
        const gcy = gy + adjY;
        if (gcx >= -halfRange && gcx <= halfRange && gcy >= -halfRange && gcy <= halfRange) {
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
  const { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px } = calcGridOffsets(setting);

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

  const calcGridPosition = generateCalcGridPositionFunc(
    setting.gridType,
    setting.centerX,
    setting.centerY,
    setting.areaWidth,
    setting.areaHeight,
    gridSize
  );
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
    const adjX = gridOffX + gridSize / 2 - offSetX_px;
    const adjY = gridOffY + gridSize / 2 - offSetY_px;
    const halfRange = setting.range * gridSize;
    for (let h = 0; h <= setting.areaHeight + 1; h++) {
      for (let w = 0; w <= setting.areaWidth + 1; w++) {
        const { gx, gy } = calcGridPosition(w, h);
        const gcx = gx + adjX;
        const gcy = gy + adjY;
        if (Math.abs(gcx) + Math.abs(gcy) <= halfRange) {
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
