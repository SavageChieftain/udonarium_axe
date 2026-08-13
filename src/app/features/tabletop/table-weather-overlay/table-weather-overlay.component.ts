import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { AmbienceService } from '@axe/application/tabletop/ambience.service';
import { skyAmbienceLayer, skyAmbienceWash } from '@axe/domain/effect/ambience/ambience-sky';
import { EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { EffectCanvasComponent } from '@axe/features/effect/effect-canvas/effect-canvas.component';

/**
 * マップ全体に掛ける天候。
 *
 * 雨や雪を盤面に寝かせて描くと、カメラを倒したときに地面を這って見える。
 * 画面に貼る 1 枚として描き、盤面の 3D 変換の外へ置く。
 */
@Component({
  selector: 'table-weather-overlay',
  templateUrl: './table-weather-overlay.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pointer-events-none absolute inset-0 z-10' },
  imports: [EffectCanvasComponent],
})
export class TableWeatherOverlayComponent {
  private readonly ambienceService = inject(AmbienceService);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly size = signal<{ width: number; height: number }>({ width: 0, height: 0 });

  readonly wash = computed<string>(() => {
    const weather = this.ambienceService.weather();
    if (!weather) return '';
    return skyAmbienceWash(weather.kind, weather.color, weather.density);
  });

  readonly layer = computed<EffectParticleLayer | null>(() => {
    const weather = this.ambienceService.weather();
    if (!weather || !this.ambienceService.motionEnabled()) return null;

    const { width, height } = this.size();
    if (width < 1 || height < 1) return null;

    const layer = skyAmbienceLayer({
      kind: weather.kind,
      color: weather.color,
      density: weather.density,
      elapsed: this.ambienceService.now(),
      width,
      height,
    });
    return layer.particles.length > 0 ? layer : null;
  });

  constructor() {
    if (typeof ResizeObserver !== 'function') return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      this.size.set({ width: Math.round(rect.width), height: Math.round(rect.height) });
    });
    observer.observe(this.elementRef.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
