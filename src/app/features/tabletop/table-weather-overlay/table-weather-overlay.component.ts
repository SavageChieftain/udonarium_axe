import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { AmbienceService } from '@axe/application/tabletop/ambience.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { skyAmbienceFlash, skyAmbienceLayer, skyAmbienceWash } from '@axe/domain/effect/ambience/ambience-sky';
import { EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { withAlpha } from '@axe/domain/effect/particles/shared';
import { EffectCanvasComponent } from '@axe/features/effect/effect-canvas/effect-canvas.component';
import {
  type ScreenPoint,
  weatherDepthDirection,
  weatherMaskImage,
} from '@axe/features/tabletop/table-weather-overlay/weather-projection';

/** 天候が届く高さ(マス)。壁を立てていないテーブルでも、盤の上に空を持たせる。 */
const MIN_SKY_CELLS = 10;

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
    // z-index は付けない。付けるとパネルより前に出てしまう。
    // パネルは重ね順を指定しないので、後ろに置いてある側が前に来る。
    class: 'pointer-events-none absolute inset-0',
    '[style.mask-image]': 'maskImage()',
    '[style.-webkit-mask-image]': 'maskImage()',
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
   * 盤面と、その上空を画面へ投影した 8 点。
   *
   * 「テーブルの上」は床の四角形ではなく、その上の空間まで含む。カメラは盤面が
   * 変わらなくても動くので、描画のたびに投影し直す。
   */
  private readonly projected = computed<ScreenPoint[]>(() => {
    if (!this.ambienceService.weather()) return [];

    const origin = this.coordinateService.tabletopOriginElement;
    if (!origin || origin === document.body) return [];

    const table = this.tabletopService.currentTableVersion();
    const width = table.width * table.gridSize;
    const depth = table.height * table.gridSize;
    if (width <= 0 || depth <= 0) return [];

    this.ambienceService.now();

    const ceiling = Math.max(table.wallHeight, MIN_SKY_CELLS) * table.gridSize;
    const box = [0, ceiling].flatMap((z) => [
      { x: 0, y: 0, z },
      { x: width, y: 0, z },
      { x: width, y: depth, z },
      { x: 0, y: depth, z },
    ]);

    const host = this.elementRef.nativeElement.getBoundingClientRect();
    return this.coordinateService
      .convertManyToGlobal(box, origin)
      .map((corner) => ({ x: corner.x - host.left, y: corner.y - host.top }));
  });

  /** 盤面の外へは掛けない。多角形で切ると空中に切り口が出るので、ぼかして消す。 */
  readonly maskImage = computed<string>(() => weatherMaskImage(this.projected()));

  readonly wash = computed<string>(() => {
    const weather = this.ambienceService.weather();
    if (!weather) return '';
    const direction = weatherDepthDirection(this.projected().slice(0, 4));
    return skyAmbienceWash(weather.kind, weather.color, weather.density, direction);
  });

  /** 稲光。盤面の上だけを照らすので、マスクの内側で焚く。 */
  readonly flash = computed<string>(() => {
    const weather = this.ambienceService.weather();
    if (!weather || !this.ambienceService.motionEnabled()) return '';

    const power = skyAmbienceFlash(weather.kind, this.ambienceService.now(), weather.density);
    return power > 0.01 ? withAlpha(weather.color, Math.round(power * 850) / 1000) : '';
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
