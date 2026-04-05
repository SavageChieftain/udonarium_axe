import { GridType } from '@axe/domain/tabletop/game-table';
import { GridPosition, RangeRenderSetting, StrokeGridFunc } from '@axe/features/tabletop/range/range-render-types';

export interface GridOffsets {
  gridSize: number;
  gridOffX: number;
  gridOffY: number;
  offSetX_px: number;
  offSetY_px: number;
}

export function calcGridOffsets(setting: RangeRenderSetting): GridOffsets {
  const gridSize = setting.gridSize;
  const offSetX_px = (setting.areaWidth * gridSize) / 2;
  const offSetY_px = (setting.areaHeight * gridSize) / 2;

  let gridOffX = -(setting.centerX % gridSize);
  let gridOffY = -(setting.centerY % gridSize);
  if (gridOffX > 0) gridOffX -= gridSize;
  if (gridOffY > 0) gridOffY -= gridSize;

  if (setting.offSetX) {
    if (gridOffX < -0.5) {
      gridOffX += gridSize / 2;
    } else {
      gridOffX -= gridSize / 2;
    }
  }

  if (setting.offSetY) {
    if (gridOffY < -0.5) {
      gridOffY += gridSize / 2;
    } else {
      gridOffY -= gridSize / 2;
    }
  }

  return { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px };
}

// ホットループ内でのオブジェクト生成を避けるための共有結果バッファ（シングルスレッドなので安全）
const _gridPos: GridPosition = { gx: 0, gy: 0 };

export function generateCalcGridPositionFunc(
  gridType: GridType,
  centerX: number,
  centerY: number,
  areaWidth: number,
  areaHeight: number,
  gridSize: number
): StrokeGridFunc {
  switch (gridType) {
    case GridType.HEX_VERTICAL: {
      // ヘクス縦揃え
      // ループ不変定数をクロージャ生成時に一度だけ計算する
      const isHalfSlideXLine = centerX % (gridSize * 2) < gridSize ? 1 : 0;
      const idAreaWidthMulti4 = areaWidth % 4 === 0 ? 1 : 0;
      const parity = isHalfSlideXLine + idAreaWidthMulti4;
      return (w, h) => {
        _gridPos.gx = w * gridSize;
        _gridPos.gy = (w + parity) % 2 === 1 ? h * gridSize : h * gridSize + gridSize / 2;
        return _gridPos;
      };
    }
    case GridType.HEX_HORIZONTAL: {
      // ヘクス横揃え(どどんとふ互換)
      // ループ不変定数をクロージャ生成時に一度だけ計算する
      const isHalfSlideYLine = centerY % (gridSize * 2) < gridSize ? 1 : 0;
      const idAreaHeightMulti4 = areaHeight % 4 === 0 ? 1 : 0;
      const parity = isHalfSlideYLine + idAreaHeightMulti4;
      return (w, h) => {
        _gridPos.gx = (h + parity) % 2 === 1 ? w * gridSize : w * gridSize + gridSize / 2;
        _gridPos.gy = h * gridSize;
        return _gridPos;
      };
    }
    default: // スクエア(default)
      return (w, h) => {
        _gridPos.gx = w * gridSize;
        _gridPos.gy = h * gridSize;
        return _gridPos;
      };
  }
}

export function makeBrush(
  context: CanvasRenderingContext2D,
  gridSize: number,
  gridColor: string
): CanvasRenderingContext2D {
  context.strokeStyle = gridColor;
  context.fillStyle = context.strokeStyle;
  context.lineWidth = 1;
  const fontSize: number = Math.floor(gridSize / 5);
  context.font = `bold ${fontSize}px sans-serif`;
  context.textBaseline = 'top';
  context.textAlign = 'center';
  return context;
}

// 多角形の構成ベクトルを盤面見下ろしで右回転にとる
// ベクトルP1P2 x Px1Pchk の外積が+ならば図形の内側にある
export function chkOuterProduct(
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
  pchkx: number,
  pchky: number
): boolean {
  const ax = p2x - p1x;
  const ay = p2y - p1y;
  const bx = pchkx - p1x;
  const by = pchky - p1y;
  const calc = ax * by - ay * bx;
  return calc >= -0.01; // 丸め誤差対策で少し許容範囲を広くする
}

export function chkInCircle(radius: number, pchkx: number, pchky: number): boolean {
  return radius * radius >= pchkx * pchkx + pchky * pchky;
}

export function fillSquare(context: CanvasRenderingContext2D, gx: number, gy: number, gridSize: number): void {
  context.fillRect(gx, gy, gridSize, gridSize);
}

function fillHex(
  context: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  gridSize: number,
  gridType: GridType
): void {
  const R = gridSize / Math.sqrt(3);
  const cx = gx + gridSize / 2;
  const cy = gy + gridSize / 2;
  const startAngle = gridType === GridType.HEX_VERTICAL ? 0 : -Math.PI / 2;
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

/** セル形状を gridType に応じて塗りつぶす。ヘクスマップでは六角形、それ以外は正方形。 */
export function fillCell(
  context: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  gridSize: number,
  gridType: GridType
): void {
  if (gridType === GridType.HEX_VERTICAL || gridType === GridType.HEX_HORIZONTAL) {
    fillHex(context, gx, gy, gridSize, gridType);
  } else {
    fillSquare(context, gx, gy, gridSize);
  }
}
