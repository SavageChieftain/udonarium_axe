import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { MoveRangeService } from '@axe/application/tabletop/move-range.service';
import { CellBits } from '@axe/domain/tabletop/fog/cell-bits';
import { CellGrid, gridExtentPx } from '@axe/domain/tabletop/fog/cell-grid';
import { moveRangeOutline, moveRangePolygons } from '@axe/features/tabletop/table-move-range-overlay/move-range-render';
import { overlayScale } from '@axe/features/tabletop/table-vision-overlay/vision-overlay-render';
import { translateZCss, Z_OFFSET_RANGE_PX } from '@axe/ui/tabletop/z-offset';

export const MOVE_RANGE_FILL = 'rgba(90, 170, 255, 0.28)';
export const MOVE_RANGE_BORDER = 'rgba(120, 200, 255, 0.95)';
/** The ground an enemy holds, shown under the reach so the two read as one picture. */
export const MOVE_ZOC_FILL = 'rgba(230, 80, 80, 0.22)';
export const MOVE_ZOC_BORDER = 'rgba(240, 120, 120, 0.75)';
const MOVE_RANGE_BORDER_WIDTH_PX = 3;

@Component({
  selector: 'table-move-range-overlay',
  templateUrl: './table-move-range-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TableMoveRangeOverlayComponent {
  private readonly moveRange = inject(MoveRangeService);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('rangeCanvas');

  protected readonly view = this.moveRange.range;
  protected readonly zTransform = translateZCss(Z_OFFSET_RANGE_PX);

  constructor() {
    effect(() => {
      const range = this.view();
      const canvas = this.canvasRef()?.nativeElement;
      if (!range || !canvas) return;
      this.paint(canvas, range.grid, range.showsReach ? range.cells : null, range.held);
    });
  }

  private paint(canvas: HTMLCanvasElement, grid: CellGrid, cells: CellBits | null, held: CellBits | null): void {
    const extent = gridExtentPx(grid);
    const width = Math.max(1, Math.ceil(extent.maxX - extent.minX));
    const height = Math.max(1, Math.ceil(extent.maxY - extent.minY));
    const scale = overlayScale(width, height);
    const pixelWidth = Math.max(1, Math.ceil(width * scale));
    const pixelHeight = Math.max(1, Math.ceil(height * scale));
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    canvas.style.left = extent.minX + 'px';
    canvas.style.top = extent.minY + 'px';
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, -extent.minX * scale, -extent.minY * scale);
    context.clearRect(extent.minX, extent.minY, width, height);

    if (held) this.paintCells(context, grid, held, MOVE_ZOC_FILL, MOVE_ZOC_BORDER);
    if (cells) this.paintCells(context, grid, cells, MOVE_RANGE_FILL, MOVE_RANGE_BORDER);
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  private paintCells(
    context: CanvasRenderingContext2D,
    grid: CellGrid,
    cells: CellBits,
    fill: string,
    stroke: string
  ): void {
    const area = new Path2D();
    for (const polygon of moveRangePolygons(grid, cells)) {
      area.moveTo(polygon[0].x, polygon[0].y);
      for (let corner = 1; corner < polygon.length; corner++) area.lineTo(polygon[corner].x, polygon[corner].y);
      area.closePath();
    }
    context.fillStyle = fill;
    context.fill(area);

    const border = new Path2D();
    for (const edge of moveRangeOutline(grid, cells)) {
      border.moveTo(edge.x1, edge.y1);
      border.lineTo(edge.x2, edge.y2);
    }
    context.strokeStyle = stroke;
    context.lineWidth = MOVE_RANGE_BORDER_WIDTH_PX;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke(border);
  }
}
