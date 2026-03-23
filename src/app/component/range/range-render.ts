import { GridType } from '@axe/class/game-table';

type StrokeGridFunc = (w: number, h: number, gridSize: number) => GridPosition;
type GridPosition = { gx: number; gy: number };

export interface RangeRenderSetting {
  areaWidth: number;
  areaHeight: number;
  range: number;
  width: number;
  centerX: number;
  centerY: number;
  gridSize: number;
  type: string;
  gridColor: string;
  rangeColor: string;
  fanDegree: number;
  degree: number;
  offSetX: boolean;
  offSetY: boolean;
  fillOutLine: boolean;
  gridType: number;
  isDocking: boolean;
}

export interface ClipAreaLine {
  clip01x: number;
  clip01y: number;
  clip02x: number;
  clip02y: number;
  clip03x: number;
  clip03y: number;
  clip04x: number;
  clip04y: number;
}

export interface ClipAreaSquare {
  clip01x: number;
  clip01y: number;
  clip02x: number;
  clip02y: number;
  clip03x: number;
  clip03y: number;
  clip04x: number;
  clip04y: number;
}

export interface ClipAreaDiamond {
  clip01x: number;
  clip01y: number;
  clip02x: number;
  clip02y: number;
  clip03x: number;
  clip03y: number;
  clip04x: number;
  clip04y: number;
}

export interface ClipAreaCorn {
  clip01x: number; // 根本始点
  clip01y: number;
  clip02x: number;
  clip02y: number;
  clip03x: number;
  clip03y: number;
  clip04x: number;
  clip04y: number;
  clip05x: number; // 先端部
  clip05y: number;
  clip06x: number; // 折り返し
  clip06y: number;
  clip07x: number;
  clip07y: number;
  clip08x: number;
  clip08y: number;
  clip09x: number;
  clip09y: number;
}

export class RangeRender {
  constructor(
    readonly canvasElement: HTMLCanvasElement,
    readonly canvasElementRange: HTMLCanvasElement
  ) {}

  private makeBrush(context: CanvasRenderingContext2D, gridSize: number, gridColor: string): CanvasRenderingContext2D {
    // 座標描画用brush設定
    context.strokeStyle = gridColor;
    context.fillStyle = context.strokeStyle;
    context.lineWidth = 1;

    const fontSize: number = Math.floor(gridSize / 5);
    context.font = `bold ${fontSize}px sans-serif`;
    context.textBaseline = 'top';
    context.textAlign = 'center';
    return context;
  }

  //多角形の構成ベクトルをを盤面見下ろしで右回転にとる
  //ベクトルP1P2 x Px1Pchk の外積が+ならば図形の内側にある
  chkOuterProduct(p1x: number, p1y: number, p2x: number, p2y: number, pchkx: number, pchky: number): boolean {
    const ax = p2x - p1x;
    const ay = p2y - p1y;
    const bx = pchkx - p1x;
    const by = pchky - p1y;
    const calc = ax * by - ay * bx;

    return calc >= -0.01 ? true : false; // 丸め誤差対策で少し許容範囲を広くする
  }

  chkInCircle(radius: number, pchkx: number, pchky: number): boolean {
    if (radius * radius >= pchkx * pchkx + pchky * pchky) {
      return true;
    } else {
      return false;
    }
  }

  renderCircle(setting: RangeRenderSetting) {
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

    this.canvasElement.width = setting.areaWidth * gridSize;
    this.canvasElement.height = setting.areaHeight * gridSize;
    let context: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;

    let gcx: number;
    let gcy: number;

    const calcGridPosition: StrokeGridFunc = this.generateCalcGridPositionFunc(
      setting.gridType,
      setting.centerX,
      setting.centerY,
      setting.areaWidth,
      setting.areaHeight
    );
    if (setting.fillOutLine) {
      this.makeBrush(context, gridSize, setting.gridColor);
      context.beginPath();
      context.arc(offSetX_px, offSetY_px, setting.range * gridSize, 0, 2 * Math.PI, true);
      context.fill();
    } else {
      this.makeBrush(context, gridSize, setting.gridColor);
      for (let h = 0; h <= setting.areaHeight + 1; h++) {
        for (let w = 0; w <= setting.areaWidth + 1; w++) {
          const { gx, gy } = calcGridPosition(w, h, gridSize);

          gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
          gcy = gy + gridOffY + gridSize / 2 - offSetY_px;

          if (this.chkInCircle(setting.range * gridSize, gcx, gcy)) {
            this.fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
          }
        }
      }
    }

    this.canvasElementRange.width = setting.areaWidth * gridSize;
    this.canvasElementRange.height = setting.areaHeight * gridSize;
    context = this.canvasElementRange.getContext('2d')!;

    this.makeBrush(context, gridSize, setting.rangeColor);
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

  renderLine(setting: RangeRenderSetting): ClipAreaLine {
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

    this.canvasElement.width = setting.areaWidth * gridSize;
    this.canvasElement.height = setting.areaHeight * gridSize;
    let context: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;

    // 範囲座標
    const p1x_ = 0;
    const p1y_ = 0.5 * setting.width * gridSize;
    const p2x_ = 0;
    const p2y_ = -0.5 * setting.width * gridSize;
    const p3x_ = setting.range * gridSize;
    const p3y_ = -0.5 * setting.width * gridSize;
    const p4x_ = setting.range * gridSize;
    const p4y_ = 0.5 * setting.width * gridSize;

    // クリッピング座標
    // コーンの根本から時計回りにクリップ範囲を定義
    const clip01x_ = p1x_ - gridSize * 1.0;
    const clip01y_ = p1y_ + gridSize * 1.0;
    const clip02x_ = p2x_ - gridSize * 1.0;
    const clip02y_ = p2y_ - gridSize * 1.0;
    const clip03x_ = p3x_ + gridSize * 1.0;
    const clip03y_ = p3y_ - gridSize * 1.0;
    const clip04x_ = p4x_ + gridSize * 1.0;
    const clip04y_ = p4y_ + gridSize * 1.0;

    // 座標変換回転
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
    let gcx: number;
    let gcy: number;

    const calcGridPosition: StrokeGridFunc = this.generateCalcGridPositionFunc(
      setting.gridType,
      setting.centerX,
      setting.centerY,
      setting.areaWidth,
      setting.areaHeight
    );
    this.makeBrush(context, gridSize, setting.gridColor);

    if (setting.fillOutLine) {
      this.makeBrush(context, gridSize, setting.gridColor);
      context.beginPath();

      context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
      context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
      context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
      context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
      context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
      context.fill();
    } else {
      this.makeBrush(context, gridSize, setting.gridColor);
      for (let h = 0; h <= setting.areaHeight + 1; h++) {
        for (let w = 0; w <= setting.areaWidth + 1; w++) {
          const { gx, gy } = calcGridPosition(w, h, gridSize);

          gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
          gcy = gy + gridOffY + gridSize / 2 - offSetY_px;

          if (
            this.chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
            this.chkOuterProduct(p2x, p2y, p3x, p3y, gcx, gcy) &&
            this.chkOuterProduct(p3x, p3y, p4x, p4y, gcx, gcy) &&
            this.chkOuterProduct(p4x, p4y, p1x, p1y, gcx, gcy)
          ) {
            this.fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
          }
        }
      }
    }
    this.canvasElementRange.width = setting.areaWidth * gridSize;
    this.canvasElementRange.height = setting.areaHeight * gridSize;
    context = this.canvasElementRange.getContext('2d')!;

    this.makeBrush(context, gridSize, setting.rangeColor);
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

  renderSquare(setting: RangeRenderSetting): ClipAreaSquare {
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

    this.canvasElement.width = setting.areaWidth * gridSize;
    this.canvasElement.height = setting.areaHeight * gridSize;
    let context: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;

    // 範囲座標
    const p1x = -setting.range * gridSize; // 左下
    const p1y = setting.range * gridSize;
    const p2x = -setting.range * gridSize; // 左上
    const p2y = -setting.range * gridSize;
    const p3x = setting.range * gridSize; // 右上
    const p3y = -setting.range * gridSize;
    const p4x = setting.range * gridSize; // 右下
    const p4y = setting.range * gridSize;

    // クリッピング座標
    // 根本から時計回りにクリップ範囲を定義
    const clip01x = p1x - gridSize * 1.0;
    const clip01y = p1y + gridSize * 1.0;
    const clip02x = p2x - gridSize * 1.0;
    const clip02y = p2y - gridSize * 1.0;
    const clip03x = p3x + gridSize * 1.0;
    const clip03y = p3y - gridSize * 1.0;
    const clip04x = p4x + gridSize * 1.0;
    const clip04y = p4y + gridSize * 1.0;

    const clip: ClipAreaSquare = {
      clip01x: clip01x, // 根本始点
      clip01y: clip01y,
      clip02x: clip02x,
      clip02y: clip02y,
      clip03x: clip03x,
      clip03y: clip03y,
      clip04x: clip04x,
      clip04y: clip04y,
    };
    let gcx: number;
    let gcy: number;

    const calcGridPosition: StrokeGridFunc = this.generateCalcGridPositionFunc(
      setting.gridType,
      setting.centerX,
      setting.centerY,
      setting.areaWidth,
      setting.areaHeight
    );
    this.makeBrush(context, gridSize, setting.gridColor);

    if (setting.fillOutLine) {
      this.makeBrush(context, gridSize, setting.gridColor);
      context.beginPath();

      context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
      context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
      context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
      context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
      context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
      context.fill();
    } else {
      this.makeBrush(context, gridSize, setting.gridColor);
      for (let h = 0; h <= setting.areaHeight + 1; h++) {
        for (let w = 0; w <= setting.areaWidth + 1; w++) {
          const { gx, gy } = calcGridPosition(w, h, gridSize);

          gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
          gcy = gy + gridOffY + gridSize / 2 - offSetY_px;

          // 全部trueで内側にある
          if (
            this.chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
            this.chkOuterProduct(p2x, p2y, p3x, p3y, gcx, gcy) &&
            this.chkOuterProduct(p3x, p3y, p4x, p4y, gcx, gcy) &&
            this.chkOuterProduct(p4x, p4y, p1x, p1y, gcx, gcy)
          ) {
            this.fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
          }
        }
      }
    }
    this.canvasElementRange.width = setting.areaWidth * gridSize;
    this.canvasElementRange.height = setting.areaHeight * gridSize;
    context = this.canvasElementRange.getContext('2d')!;

    this.makeBrush(context, gridSize, setting.rangeColor);
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

  renderDiamond(setting: RangeRenderSetting): ClipAreaDiamond {
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

    this.canvasElement.width = setting.areaWidth * gridSize;
    this.canvasElement.height = setting.areaHeight * gridSize;
    let context: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;

    // 範囲座標
    const p1x = -setting.range * gridSize; // 左
    const p1y = 0;
    const p2x = 0; // 上
    const p2y = -setting.range * gridSize;
    const p3x = setting.range * gridSize; // 右
    const p3y = 0;
    const p4x = 0; // 下
    const p4y = setting.range * gridSize;

    // クリッピング座標
    // 根本から時計回りにクリップ範囲を定義
    const clip01x = p1x - gridSize * 1.2;
    const clip01y = 0;
    const clip02x = 0;
    const clip02y = p2y - gridSize * 1.2;
    const clip03x = p3x + gridSize * 1.2;
    const clip03y = 0;
    const clip04x = 0;
    const clip04y = p4y + gridSize * 1.2;

    const clip: ClipAreaSquare = {
      clip01x: clip01x, // 根本始点
      clip01y: clip01y,
      clip02x: clip02x,
      clip02y: clip02y,
      clip03x: clip03x,
      clip03y: clip03y,
      clip04x: clip04x,
      clip04y: clip04y,
    };
    let gcx: number;
    let gcy: number;

    const calcGridPosition: StrokeGridFunc = this.generateCalcGridPositionFunc(
      setting.gridType,
      setting.centerX,
      setting.centerY,
      setting.areaWidth,
      setting.areaHeight
    );
    this.makeBrush(context, gridSize, setting.gridColor);

    if (setting.fillOutLine) {
      this.makeBrush(context, gridSize, setting.gridColor);
      context.beginPath();

      context.moveTo(p1x + offSetX_px, p1y + offSetY_px);
      context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
      context.lineTo(p3x + offSetX_px, p3y + offSetY_px);
      context.lineTo(p4x + offSetX_px, p4y + offSetY_px);
      context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
      context.fill();
    } else {
      this.makeBrush(context, gridSize, setting.gridColor);
      for (let h = 0; h <= setting.areaHeight + 1; h++) {
        for (let w = 0; w <= setting.areaWidth + 1; w++) {
          const { gx, gy } = calcGridPosition(w, h, gridSize);

          gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
          gcy = gy + gridOffY + gridSize / 2 - offSetY_px;

          // 全部trueで内側にある
          if (
            this.chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
            this.chkOuterProduct(p2x, p2y, p3x, p3y, gcx, gcy) &&
            this.chkOuterProduct(p3x, p3y, p4x, p4y, gcx, gcy) &&
            this.chkOuterProduct(p4x, p4y, p1x, p1y, gcx, gcy)
          ) {
            this.fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
          }
        }
      }
    }
    this.canvasElementRange.width = setting.areaWidth * gridSize;
    this.canvasElementRange.height = setting.areaHeight * gridSize;
    context = this.canvasElementRange.getContext('2d')!;

    this.makeBrush(context, gridSize, setting.rangeColor);
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

  renderCorn(setting: RangeRenderSetting): ClipAreaCorn {
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

    this.canvasElement.width = setting.areaWidth * gridSize;
    this.canvasElement.height = setting.areaHeight * gridSize;
    let context: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;

    // 範囲座標
    const cx_ = 0.0;
    const cy_ = 0.0;
    const p1x_ = setting.range * gridSize;
    const p1y_ = -0.5 * setting.width * gridSize;
    const p2x_ = setting.range * gridSize;
    const p2y_ = 0.5 * setting.width * gridSize;

    // クリッピング座標
    // コーンの根本から時計回りにクリップ範囲を定義
    const clip01x_ = cx_ - gridSize * 1.5; // コーン根本
    const clip01y_ = cy_;
    const clip02x_ = cx_ - gridSize * 1.0; // 領部根本
    const clip02y_ = cy_ - gridSize * 1.0;
    const clip03x_ = p1x_ - gridSize * 1.0; // 領部先端
    const clip03y_ = p1y_ - gridSize * 1.0;
    const clip04x_ = p1x_; // 領部先端2
    const clip04y_ = p1y_ - gridSize * 1.0;
    const clip05x_ = p1x_ + gridSize * 1.0; // 領部先端3
    const clip05y_ = p1y_ - gridSize * 1.0;

    const clip06x_ = clip05x_; // 領部先端3
    const clip06y_ = -clip05y_;
    const clip07x_ = clip04x_;
    const clip07y_ = -clip04y_;
    const clip08x_ = clip03x_;
    const clip08y_ = -clip03y_;
    const clip09x_ = clip02x_;
    const clip09y_ = -clip02y_;

    // 座標変換回転
    const rad = (Math.PI / 180) * setting.degree;
    const cx = cx_;
    const cy = cy_;
    const p1x = p1x_ * Math.cos(rad) - p1y_ * Math.sin(rad);
    const p1y = p1x_ * Math.sin(rad) + p1y_ * Math.cos(rad);
    const p2x = p2x_ * Math.cos(rad) - p2y_ * Math.sin(rad);
    const p2y = p2x_ * Math.sin(rad) + p2y_ * Math.cos(rad);

    const clip: ClipAreaCorn = {
      clip01x: clip01x_ * Math.cos(rad) - clip01y_ * Math.sin(rad), // 根本支店
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

    let gcx: number;
    let gcy: number;

    const calcGridPosition: StrokeGridFunc = this.generateCalcGridPositionFunc(
      setting.gridType,
      setting.centerX,
      setting.centerY,
      setting.areaWidth,
      setting.areaHeight
    );

    if (setting.fillOutLine) {
      this.makeBrush(context, gridSize, setting.gridColor);
      context.beginPath();

      context.moveTo(cx + offSetX_px, cy + offSetY_px);
      context.lineTo(p1x + offSetX_px, p1y + offSetY_px);
      context.lineTo(p2x + offSetX_px, p2y + offSetY_px);
      context.lineTo(cx + offSetX_px, cy + offSetY_px);
      context.fill();
    } else {
      this.makeBrush(context, gridSize, setting.gridColor);
      for (let h = 0; h <= setting.areaHeight + 1; h++) {
        for (let w = 0; w <= setting.areaWidth + 1; w++) {
          const { gx, gy } = calcGridPosition(w, h, gridSize);

          gcx = gx + gridOffX + gridSize / 2 - offSetX_px;
          gcy = gy + gridOffY + gridSize / 2 - offSetY_px;
          // 全部trueで内側にある
          if (
            this.chkOuterProduct(cx, cy, p1x, p1y, gcx, gcy) &&
            this.chkOuterProduct(p1x, p1y, p2x, p2y, gcx, gcy) &&
            this.chkOuterProduct(p2x, p2y, cx, cy, gcx, gcy)
          ) {
            this.fillSquare(context, gx + gridOffX, gy + gridOffY, gridSize);
          }
        }
      }
    }

    this.canvasElementRange.width = setting.areaWidth * gridSize;
    this.canvasElementRange.height = setting.areaHeight * gridSize;
    context = this.canvasElementRange.getContext('2d')!;

    this.makeBrush(context, gridSize, setting.rangeColor);
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

  private generateCalcGridPositionFunc(
    gridType: GridType,
    centerX: number,
    centerY: number,
    areaWidth: number,
    areaHeight: number
  ): StrokeGridFunc {
    switch (gridType) {
      case GridType.HEX_VERTICAL: // ヘクス縦揃え
        return (w, h, gridSize) => {
          const isHalfSlideXLine = centerX % (gridSize * 2) < gridSize ? 1 : 0;
          const idAreaWidthMulti4 = areaWidth % 4 == 0 ? 1 : 0;
          if ((w + isHalfSlideXLine + idAreaWidthMulti4) % 2 === 1) {
            return { gx: w * gridSize, gy: h * gridSize };
          } else {
            return { gx: w * gridSize, gy: h * gridSize + gridSize / 2 };
          }
        };
      case GridType.HEX_HORIZONTAL: // ヘクス横揃え(どどんとふ互換)
        return (w, h, gridSize) => {
          const isHalfSlideYLine = centerY % (gridSize * 2) < gridSize ? 1 : 0;
          const idAreaHeightMulti4 = areaHeight % 4 == 0 ? 1 : 0;
          if ((h + isHalfSlideYLine + idAreaHeightMulti4) % 2 === 1) {
            return { gx: w * gridSize, gy: h * gridSize };
          } else {
            return { gx: w * gridSize + gridSize / 2, gy: h * gridSize };
          }
        };
      default: // スクエア(default)
        return (w, h, gridSize) => {
          return { gx: w * gridSize, gy: h * gridSize };
        };
    }
  }

  private fillSquare(context: CanvasRenderingContext2D, gx: number, gy: number, gridSize: number) {
    context.beginPath();
    context.fillRect(gx, gy, gridSize, gridSize);
  }

  private strokeSquare(context: CanvasRenderingContext2D, gx: number, gy: number, gridSize: number) {
    context.beginPath();
    context.strokeRect(gx, gy, gridSize, gridSize);
  }

  private strokeHex(context: CanvasRenderingContext2D, gx: number, gy: number, gridSize: number, gridType: GridType) {
    let deg = gridType === GridType.HEX_HORIZONTAL ? -30 : 0;
    const radius = gridSize / Math.sqrt(3);
    const cx = gx + gridSize / 2;
    const cy = gy + gridSize / 2;

    context.beginPath();
    for (let i = 0; i < 6; i++) {
      deg += 60;
      const radian = (Math.PI / 180) * deg;
      const x = Math.cos(radian) * radius + cx;
      const y = Math.sin(radian) * radius + cy;
      context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
  }
}
