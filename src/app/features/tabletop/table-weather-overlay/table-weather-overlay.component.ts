import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { AmbienceService } from '@axe/application/tabletop/ambience.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
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
  host: {
    class: 'pointer-events-none absolute inset-0 z-10',
    '[style.clip-path]': 'clipPath()',
  },
  imports: [EffectCanvasComponent],
})
export class TableWeatherOverlayComponent {
  private readonly ambienceService = inject(AmbienceService);
  private readonly tabletopService = inject(TabletopService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly size = signal<{ width: number; height: number }>({ width: 0, height: 0 });

  /**
   * 天候はテーブルの上だけに降らせる。
   *
   * 画面に貼る 1 枚なので、そのままだと盤の外の余白にも降ってしまう。
   * 盤面の四隅を画面へ投影して、その四角形で切り抜く。カメラを回すたびに形が変わるので毎回作り直す。
   */
  readonly clipPath = computed<string>(() => {
    if (!this.ambienceService.weather()) return 'none';

    const origin = this.coordinateService.tabletopOriginElement;
    if (!origin || origin === document.body) return 'none';

    const table = this.tabletopService.currentTableVersion();
    const width = table.width * table.gridSize;
    const height = table.height * table.gridSize;
    if (width <= 0 || height <= 0) return 'none';

    // 盤面が動いていなくてもカメラは動く。描画のたびに投影し直す。
    this.ambienceService.now();

    const corners = this.coordinateService.convertManyToGlobal(
      [
        { x: 0, y: 0, z: 0 },
        { x: width, y: 0, z: 0 },
        { x: width, y: height, z: 0 },
        { x: 0, y: height, z: 0 },
      ],
      origin
    );
    if (corners.some((corner) => !Number.isFinite(corner.x) || !Number.isFinite(corner.y))) return 'none';

    const host = this.elementRef.nativeElement.getBoundingClientRect();
    const points = corners.map(
      (corner) => `${(corner.x - host.left).toFixed(1)}px ${(corner.y - host.top).toFixed(1)}px`
    );
    return `polygon(${points.join(', ')})`;
  });

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
