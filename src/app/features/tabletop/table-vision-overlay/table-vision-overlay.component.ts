import { ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, viewChild } from '@angular/core';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { GridType } from '@axe/domain/tabletop/game-table';
import { HEX_SURFACE_INFLATE_PX, hexSurfaceCells, SurfacePoint } from '@axe/domain/tabletop/surface-cells';
import { computeOverlayPlan, OverlayPlan } from '@axe/domain/tabletop/vision-scene';
import { computeHexMaskGeometry } from '@axe/features/tabletop/game-table-mask/game-table-mask-helpers';
import { drawOverlayPlan } from '@axe/features/tabletop/table-vision-overlay/vision-overlay-render';
import { translateZCss, Z_OFFSET_DARKNESS_PX } from '@axe/ui/tabletop/z-offset';

const SPILL_MARGIN_CAP_PX = 800;
/** ゆらめきを描き直す間隔(ms)。約 20 回/秒。 */
export const VISION_ANIMATION_INTERVAL_MS = 50;

@Component({
  selector: 'table-vision-overlay',
  templateUrl: './table-vision-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TableVisionOverlayComponent {
  protected readonly visionService = inject(VisionService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly zTransform = translateZCss(Z_OFFSET_DARKNESS_PX);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('overlayCanvas');

  private plan: OverlayPlan | null = null;
  private surfaceWidth = 0;
  private surfaceHeight = 0;
  private surfaceOriginX = 0;
  private surfaceOriginY = 0;
  private surfaceCells: SurfacePoint[][] | undefined = undefined;
  private margin = 0;
  private animated = false;
  private rafId: number | null = null;
  private readonly images = new Map<string, HTMLImageElement>();

  constructor() {
    effect(() => {
      const canvas = this.canvasRef().nativeElement;
      const scene = this.visionService.scene();
      const viewer = this.visionService.viewer();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (!scene) {
        this.plan = null;
        this.animated = false;
        this.margin = 0;
        this.surfaceCells = undefined;
        this.stopLoop();
        if (canvas.width !== 0) canvas.width = 0;
        if (canvas.height !== 0) canvas.height = 0;
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        return;
      }
      const maxDim = scene.lights.reduce((m, l) => Math.max(m, l.dimPx), 0);
      this.margin = Math.min(SPILL_MARGIN_CAP_PX, Math.ceil(maxDim));

      const gridType = scene.gridType ?? GridType.SQUARE;
      const cols = scene.gridSize > 0 ? Math.round(scene.widthPx / scene.gridSize) : 0;
      const rows = scene.gridSize > 0 ? Math.round(scene.heightPx / scene.gridSize) : 0;
      const hex = computeHexMaskGeometry(cols, rows, scene.gridSize, gridType);
      this.surfaceOriginX = hex ? -hex.offsetX : 0;
      this.surfaceOriginY = hex ? -hex.offsetY : 0;
      this.surfaceWidth = hex ? hex.pixelW : scene.widthPx;
      this.surfaceHeight = hex ? hex.pixelH : scene.heightPx;
      this.surfaceCells = hex
        ? hexSurfaceCells(cols, rows, scene.gridSize, gridType, HEX_SURFACE_INFLATE_PX)
        : undefined;

      const cw = this.surfaceWidth + 2 * this.margin;
      const ch = this.surfaceHeight + 2 * this.margin;
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      canvas.style.left = this.surfaceOriginX - this.margin + 'px';
      canvas.style.top = this.surfaceOriginY - this.margin + 'px';
      this.plan = computeOverlayPlan(scene, viewer);
      this.animated = scene.lights.some((light) => light.animation && light.animation !== 'none');
      this.ensureImages();
      this.draw(this.now());
      this.syncLoop();
    });
    this.destroyRef.onDestroy(() => this.stopLoop());
  }

  private now(): number {
    return typeof performance !== 'undefined' ? performance.now() : 0;
  }

  private ensureImages(): void {
    if (!this.plan) return;
    for (const shadow of this.plan.shadows) {
      if (!shadow.imageUrl || this.images.has(shadow.imageUrl)) continue;
      const image = new Image();
      image.onload = () => this.draw(this.now());
      image.src = shadow.imageUrl;
      this.images.set(shadow.imageUrl, image);
    }
  }

  private draw(timeMs: number): void {
    const ctx = this.canvasRef().nativeElement.getContext('2d');
    if (!ctx || !this.plan) return;
    drawOverlayPlan(ctx, this.plan, this.surfaceWidth, this.surfaceHeight, timeMs, this.images, this.margin, {
      originX: this.surfaceOriginX,
      originY: this.surfaceOriginY,
      cells: this.surfaceCells,
    });
  }

  /**
   * ゆらめきの描き直しは毎フレームまで要らない。
   *
   * 1 枚描くのに掛かるのは盤面ぜんぶの塗り直しで、変わるのは光のゆらぎだけ。
   * 画面の更新に合わせて描くと、重い処理を 60 回/秒くり返すことになる。
   */
  private lastFrameAt = 0;

  private readonly loop = (): void => {
    const now = this.now();
    if (now - this.lastFrameAt >= VISION_ANIMATION_INTERVAL_MS) {
      this.lastFrameAt = now;
      this.draw(now);
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  private syncLoop(): void {
    if (this.animated) {
      if (this.rafId === null) this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.stopLoop();
    }
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
