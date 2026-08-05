import { ChangeDetectionStrategy, Component, effect, ElementRef, input, viewChild } from '@angular/core';
import { EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { drawParticleLayer } from '@axe/features/effect/effect-canvas/draw-particles';

const MAX_PIXEL_RATIO = 2;

@Component({
  selector: 'effect-canvas',
  templateUrl: './effect-canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EffectCanvasComponent {
  readonly layer = input.required<EffectParticleLayer>();

  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private context: CanvasRenderingContext2D | null = null;
  private sizedFor = '';

  constructor() {
    effect(() => {
      const layer = this.layer();
      const canvas = this.canvasRef()?.nativeElement;
      if (!canvas) return;

      const pixelRatio = Math.min(devicePixelRatioOf(), MAX_PIXEL_RATIO);
      this.resize(canvas, layer, pixelRatio);
      if (!this.context) this.context = canvas.getContext('2d');
      if (this.context) drawParticleLayer(this.context, layer, pixelRatio);
    });
  }

  private resize(canvas: HTMLCanvasElement, layer: EffectParticleLayer, pixelRatio: number): void {
    const signature = `${layer.width}x${layer.height}@${pixelRatio}`;
    if (this.sizedFor === signature) return;
    this.sizedFor = signature;
    canvas.width = Math.round(layer.width * pixelRatio);
    canvas.height = Math.round(layer.height * pixelRatio);
  }
}

function devicePixelRatioOf(): number {
  return typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
}
