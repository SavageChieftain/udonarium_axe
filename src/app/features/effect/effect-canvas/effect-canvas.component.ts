import { ChangeDetectionStrategy, Component, effect, ElementRef, input, viewChild } from '@angular/core';
import { EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { drawParticleLayer } from '@axe/features/effect/effect-canvas/draw-particles';

const MAX_PIXEL_RATIO = 2;

/**
 * canvas 1 枚で持つ画素数の上限。
 * マップ全体を覆う環境エフェクトは一辺が数千 px になり、等倍でも数千万画素、
 * 高精細画面では数億画素になる。確保に失敗して真っ白になるより、粗く描くほうがよい。
 */
const MAX_CANVAS_PIXELS = 4_000_000;

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

      const pixelRatio = pixelRatioFor(layer);
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

export function pixelRatioFor(layer: EffectParticleLayer): number {
  const ratio = Math.min(devicePixelRatioOf(), MAX_PIXEL_RATIO);
  const pixels = layer.width * layer.height;
  if (!(pixels > 0)) return ratio;
  return Math.min(ratio, Math.sqrt(MAX_CANVAS_PIXELS / pixels));
}
