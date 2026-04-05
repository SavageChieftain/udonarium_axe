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

export function isHexGrid(gridType: GridType): boolean {
  return gridType === GridType.HEX_VERTICAL || gridType === GridType.HEX_HORIZONTAL;
}

function fillHexAt(context: CanvasRenderingContext2D, cx: number, cy: number, s: number, startAngle: number): void {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = startAngle + (i * Math.PI) / 3;
    const x = cx + s * Math.cos(angle);
    const y = cy + s * Math.sin(angle);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
}

/**
 * ヘクスグリッド上のセルを塗りつぶす。
 * GridLineRender と同じジオメトリ (circumradius = gridSize / √3) でタイリングし、
 * hitTest に合格したセルのみ描画する。
 * @param hitTest (gcx, gcy) はレンジ原点からの相対座標 (px)
 */
function fillHexGridCells(
  context: CanvasRenderingContext2D,
  setting: RangeRenderSetting,
  hitTest: (gcx: number, gcy: number) => boolean
): void {
  const gridSize = setting.gridSize;
  const s = gridSize / Math.sqrt(3); // circumradius — GridLineRender と同値
  const isFlatTop = setting.gridType === GridType.HEX_VERTICAL;

  const colSpacing = isFlatTop ? 1.5 * s : gridSize;
  const rowSpacing = isFlatTop ? gridSize : 1.5 * s;

  const canvasW = setting.areaWidth * gridSize;
  const canvasH = setting.areaHeight * gridSize;
  const offsetX = canvasW / 2;
  const offsetY = canvasH / 2;

  // レンジのテーブル上位置
  const cx0 = setting.centerX;
  const cy0 = setting.centerY;

  // キャンバス全域をカバーするイテレーション範囲
  const colMin = Math.floor((cx0 - canvasW / 2) / colSpacing) - 1;
  const colMax = Math.ceil((cx0 + canvasW / 2) / colSpacing) + 1;
  const rowMin = Math.floor((cy0 - canvasH / 2) / rowSpacing) - 1;
  const rowMax = Math.ceil((cy0 + canvasH / 2) / rowSpacing) + 1;

  makeBrush(context, gridSize, setting.gridColor);
  const startAngle = isFlatTop ? 0 : -Math.PI / 2;

  for (let col = colMin; col <= colMax; col++) {
    for (let row = rowMin; row <= rowMax; row++) {
      let hx: number;
      let hy: number;
      if (isFlatTop) {
        hx = col * colSpacing;
        hy = row * rowSpacing + (Math.abs(col % 2) === 1 ? rowSpacing / 2 : 0);
      } else {
        hx = col * colSpacing + (Math.abs(row % 2) === 1 ? colSpacing / 2 : 0);
        hy = row * rowSpacing;
      }

      const gcx = hx - cx0;
      const gcy = hy - cy0;

      if (hitTest(gcx, gcy)) {
        fillHexAt(context, gcx + offsetX, gcy + offsetY, s, startAngle);
      }
    }
  }
}

/**
 * スクエアグリッド上のセルを塗りつぶす。
 * hitTest に合格したセルのみ描画する。
 * @param hitTest (gcx, gcy) はレンジ原点からの相対座標 (px)
 */
function fillSquareGridCells(
  context: CanvasRenderingContext2D,
  setting: RangeRenderSetting,
  offsets: GridOffsets,
  hitTest: (gcx: number, gcy: number) => boolean
): void {
  const { gridSize, gridOffX, gridOffY, offSetX_px, offSetY_px } = offsets;
  const calcGridPosition = generateCalcGridPositionFunc(
    setting.gridType,
    setting.centerX,
    setting.centerY,
    setting.areaWidth,
    setting.areaHeight,
    gridSize
  );
  makeBrush(context, gridSize, setting.gridColor);
  const adjX = gridOffX + gridSize / 2 - offSetX_px;
  const adjY = gridOffY + gridSize / 2 - offSetY_px;
  for (let h = 0; h <= setting.areaHeight + 1; h++) {
    for (let w = 0; w <= setting.areaWidth + 1; w++) {
      const { gx, gy } = calcGridPosition(w, h);
      if (hitTest(gx + adjX, gy + adjY)) {
        fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
      }
    }
  }
}

/**
 * グリッド種別に応じたセル塗りつぶしを行う統合関数。
 * ヘクスグリッドなら fillHexGridCells、スクエアグリッドなら fillSquareGridCells にディスパッチする。
 * @param hitTest (gcx, gcy) はレンジ原点からの相対座標 (px)
 */
export function fillGridCells(
  context: CanvasRenderingContext2D,
  setting: RangeRenderSetting,
  offsets: GridOffsets,
  hitTest: (gcx: number, gcy: number) => boolean
): void {
  if (isHexGrid(setting.gridType)) {
    fillHexGridCells(context, setting, hitTest);
  } else {
    fillSquareGridCells(context, setting, offsets, hitTest);
  }
}
