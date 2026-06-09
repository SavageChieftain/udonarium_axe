import { ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, viewChild } from '@angular/core';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { computeOverlayPlan, OverlayPlan } from '@axe/domain/tabletop/vision-scene';
import { drawOverlayPlan } from '@axe/features/tabletop/table-vision-overlay/vision-overlay-render';
import { translateZCss, Z_OFFSET_DARKNESS_PX } from '@axe/ui/tabletop/z-offset';

const SPILL_MARGIN_CAP_PX = 800;

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
  private planWidth = 0;
  private planHeight = 0;
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
        this.stopLoop();
        if (canvas.width !== 0) canvas.width = 0;
        if (canvas.height !== 0) canvas.height = 0;
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        return;
      }
      const maxDim = scene.lights.reduce((m, l) => Math.max(m, l.dimPx), 0);
      this.margin = Math.min(SPILL_MARGIN_CAP_PX, Math.ceil(maxDim));
      const cw = scene.widthPx + 2 * this.margin;
      const ch = scene.heightPx + 2 * this.margin;
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
      canvas.style.left = -this.margin + 'px';
      canvas.style.top = -this.margin + 'px';
      this.plan = computeOverlayPlan(scene, viewer);
      this.planWidth = scene.widthPx;
      this.planHeight = scene.heightPx;
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
    drawOverlayPlan(ctx, this.plan, this.planWidth, this.planHeight, timeMs, this.images, this.margin);
  }

  private readonly loop = (): void => {
    this.draw(this.now());
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
