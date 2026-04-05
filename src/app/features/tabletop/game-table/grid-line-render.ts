import { GridType } from '@axe/domain/tabletop/game-table';
import {
  hexCellCenter,
  hexCircumradius,
  hexSpacing,
  hexStartAngle,
  strokeHexPath,
} from '@axe/domain/tabletop/hex-geometry';

export class GridLineRender {
  constructor(readonly canvasElement: HTMLCanvasElement) {}

  private makeBrush(
    context: CanvasRenderingContext2D,
    gridSize: number,
    gridColor: string,
    gridFontColor: string
  ): void {
    context.strokeStyle = gridColor;
    context.fillStyle = gridFontColor;
    context.lineWidth = 1;

    const fontSize: number = Math.floor(gridSize / 5);
    context.font = `bold ${fontSize}px sans-serif`;
    context.textBaseline = 'top';
    context.textAlign = 'center';
  }

  render(
    width: number,
    height: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6',
    gridFontColor: string = gridColor,
    overTerrain = false,
    offsetTop: number = 0,
    offsetLeft: number = 0
  ) {
    this.canvasElement.width = width * gridSize;
    this.canvasElement.height = height * gridSize;
    const context: CanvasRenderingContext2D = this.canvasElement.getContext('2d')!;

    if (gridType < 0) return;

    this.makeBrush(context, gridSize, gridColor, gridFontColor);

    switch (gridType) {
      case GridType.SQUARE:
        this.renderSquareGrid(context, width, height, gridSize, overTerrain, offsetTop, offsetLeft);
        break;
      case GridType.HEX_VERTICAL:
      case GridType.HEX_HORIZONTAL:
        this.renderHexGrid(context, width, height, gridSize, gridType, overTerrain, offsetTop, offsetLeft);
        break;
    }
  }

  private renderSquareGrid(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    gridSize: number,
    overTerrain: boolean,
    offsetTop: number,
    offsetLeft: number
  ) {
    const offTop = overTerrain ? Math.floor(offsetTop / gridSize) + 1 : 0;
    const offLeft = overTerrain ? Math.floor(offsetLeft / gridSize) + 1 : 0;

    for (let h = 0; h <= height; h++) {
      for (let w = 0; w <= width; w++) {
        const gx = w * gridSize;
        const gy = h * gridSize;
        context.beginPath();
        context.strokeRect(gx, gy, gridSize, gridSize);
        context.fillText(w + 1 + offLeft + '-' + (h + 1 + offTop), gx + gridSize / 2, gy + gridSize / 2);
      }
    }
  }

  private renderHexGrid(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    gridSize: number,
    gridType: GridType,
    overTerrain: boolean,
    offsetTop: number,
    offsetLeft: number
  ) {
    const s = hexCircumradius(gridSize);
    const canvasW = width * gridSize;
    const canvasH = height * gridSize;

    const isFlatTop = gridType === GridType.HEX_VERTICAL;
    const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);
    const startAngle = hexStartAngle(isFlatTop);

    const numCols = Math.ceil(canvasW / colSpacing) + 2;
    const numRows = Math.ceil(canvasH / rowSpacing) + 2;

    const offCol = overTerrain ? Math.floor(offsetLeft / colSpacing) + 1 : 0;
    const offRow = overTerrain ? Math.floor(offsetTop / rowSpacing) + 1 : 0;

    context.textBaseline = 'middle';

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const { x: cx, y: cy } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);

        if (cx < -gridSize || cx > canvasW + gridSize || cy < -gridSize || cy > canvasH + gridSize) continue;

        strokeHexPath(context, cx, cy, s, startAngle);
        context.fillText(col + 1 + offCol + '-' + (row + 1 + offRow), cx, cy);
      }
    }
  }
}
