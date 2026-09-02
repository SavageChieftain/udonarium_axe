import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, viewChildren } from '@angular/core';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { OverlayVision } from '@axe/domain/tabletop/vision-scene';
import { FogAirLayer, fogAirLayers } from '@axe/features/tabletop/fog-of-war/fog-air-layers';
import { fogPattern } from '@axe/features/tabletop/table-vision-overlay/fog-texture';
import { fillCells } from '@axe/features/tabletop/table-vision-overlay/vision-overlay-render';

/** How wide a sheet is drawn, in pixels of its own, before it is let up to the size of the board. */
const SHEET_TARGET_PX = 512;
/** How far past the board a sheet reaches, so its drift never uncovers an edge. */
const SHEET_MARGIN = 0.06;
/** How much of a sheet the ground it stands for is worth, against the mottling over it. */
const SHEET_WASH = 0.55;
const SHEET_BLUR_CELLS = 0.6;

interface Sheet {
  layer: FogAirLayer;
  style: Record<string, string>;
}

/**
 * The fog that hangs in the air over ground nobody has walked to.
 *
 * The sheet is drawn small and let up to the size of the board, which is what keeps this
 * affordable: fog in the air has no edges to hold, so a board a hundred cells across is
 * still a picture a few hundred pixels wide. The drifting is a transform, so it costs the
 * browser a composite and this code nothing at all.
 */
@Component({
  selector: 'table-fog-air-overlay',
  templateUrl: './table-fog-air-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  imports: [NgStyle],
})
export class TableFogAirOverlayComponent {
  private readonly visionService = inject(VisionService);
  private readonly tabletopService = inject(TabletopService);
  private readonly canvasRefs = viewChildren<ElementRef<HTMLCanvasElement>>('sheet');

  readonly sheets = computed<Sheet[]>(() => {
    const vision = this.visionService.overlayVision();
    const table = this.tabletopService.currentTableVersion();
    if (!vision?.fogEnabled || table.gridSize <= 0) return [];
    const widthPx = table.width * table.gridSize;
    const heightPx = table.height * table.gridSize;
    if (widthPx <= 0 || heightPx <= 0) return [];

    const marginX = widthPx * SHEET_MARGIN;
    const marginY = heightPx * SHEET_MARGIN;
    return fogAirLayers(table.gridSize).map((layer) => ({
      layer,
      style: {
        position: 'absolute',
        left: -marginX + 'px',
        top: -marginY + 'px',
        width: widthPx + marginX * 2 + 'px',
        height: heightPx + marginY * 2 + 'px',
        'pointer-events': 'none',
        opacity: layer.alpha.toFixed(3),
        'animation-name': 'fogDrift',
        'animation-duration': layer.durationSec + 's',
        'animation-delay': layer.delaySec + 's',
        'animation-timing-function': 'ease-in-out',
        'animation-iteration-count': 'infinite',
        'animation-direction': 'alternate',
      },
    }));
  });

  constructor() {
    effect(() => {
      const sheets = this.sheets();
      const vision = this.visionService.overlayVision();
      const canvases = this.canvasRefs();
      if (sheets.length === 0 || !vision) return;
      const table = this.tabletopService.currentTableVersion();
      for (let i = 0; i < canvases.length && i < sheets.length; i++) {
        this.paint(canvases[i].nativeElement, vision, table.gridSize, i);
      }
    });
  }

  protected wrapperStyle(layer: FogAirLayer): Record<string, string> {
    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      'transform-style': 'preserve-3d',
      transform: `translateZ(${layer.heightPx}px)`,
      'pointer-events': 'none',
    };
  }

  private paint(canvas: HTMLCanvasElement, vision: OverlayVision, gridSizePx: number, index: number): void {
    const grid = vision.grid;
    const context = canvas.getContext('2d');
    if (!context || grid.cols < 1 || grid.rows < 1) return;

    const boardWidth = grid.cols * gridSizePx;
    const boardHeight = grid.rows * gridSizePx;
    const longest = Math.max(boardWidth, boardHeight);
    const target = SHEET_TARGET_PX;
    const scale = Math.min(1, target / longest);
    const marginX = boardWidth * SHEET_MARGIN;
    const marginY = boardHeight * SHEET_MARGIN;
    const width = Math.max(1, Math.ceil((boardWidth + marginX * 2) * scale));
    const height = Math.max(1, Math.ceil((boardHeight + marginY * 2) * scale));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    context.setTransform(scale, 0, 0, scale, marginX * scale, marginY * scale);
    context.clearRect(-marginX, -marginY, boardWidth + marginX * 2, boardHeight + marginY * 2);
    context.globalCompositeOperation = 'source-over';

    // Only over ground nobody has walked to. Once it is cleared the mist is gone from it,
    // in the air as well as on the floor.
    const blurPx = SHEET_BLUR_CELLS * gridSizePx;
    const unwalked = (cell: number): boolean => !vision.explored.get(cell);

    context.fillStyle = vision.fogColor;
    context.globalAlpha = SHEET_WASH;
    fillCells(context, grid, unwalked, blurPx);

    const pattern = fogPattern(context);
    if (pattern) {
      // Each sheet takes the mottling from a different corner of it, so the three of them do
      // not stack up as one picture seen three times.
      shiftPattern(pattern, index * 137, index * 91);
      context.fillStyle = pattern;
      context.globalAlpha = 1;
      fillCells(context, grid, unwalked, blurPx);
    }
    context.globalAlpha = 1;
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
}

function shiftPattern(pattern: CanvasPattern, dx: number, dy: number): void {
  if (typeof pattern.setTransform !== 'function' || typeof DOMMatrix !== 'function') return;
  pattern.setTransform(new DOMMatrix().translate(dx, dy));
}
