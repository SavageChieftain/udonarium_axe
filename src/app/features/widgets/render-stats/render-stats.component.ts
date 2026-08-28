import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, viewChild } from '@angular/core';
import { RenderStatsService } from '@axe/application/ui/render-stats.service';
import { WidgetLayoutService } from '@axe/application/ui/widget-layout.service';
import { placeWidget, rememberWidget, WIDGET_RENDER_STATS } from '@axe/application/ui/widget-place';
import { WidgetVisibilityService } from '@axe/application/ui/widget-visibility.service';
import { PERF_TERRAIN_GRID_RASTER, PERF_VISION_MEMO_MISS, PERF_VISION_SCENE } from '@axe/core/util/perf-counters';
import { DraggableDirective } from '@axe/ui/directives/draggable.directive';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-render-stats',
  templateUrl: './render-stats.component.html',
  imports: [DecimalPipe, DraggableDirective],
})
export class RenderStatsComponent {
  protected readonly widgets = inject(WidgetVisibilityService);
  private readonly renderStats = inject(RenderStatsService);
  private readonly layout = inject(WidgetLayoutService);

  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly stats = this.renderStats.stats;

  protected readonly perTerrain = computed(() => this.stats().elementsPerTerrain.toFixed(1));
  protected readonly sceneBuilds = computed(() => this.counterOf(PERF_VISION_SCENE));
  protected readonly memoMisses = computed(() => this.counterOf(PERF_VISION_MEMO_MISS));
  protected readonly gridRasters = computed(() => this.counterOf(PERF_TERRAIN_GRID_RASTER));

  private static readonly named = new Set<string>([PERF_VISION_SCENE, PERF_VISION_MEMO_MISS, PERF_TERRAIN_GRID_RASTER]);

  protected readonly otherCounters = computed(() =>
    [...this.stats().counters]
      .filter(([key]) => !RenderStatsComponent.named.has(key))
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count }))
  );

  constructor() {
    effect(() => {
      if (this.widgets.renderStats()) {
        this.renderStats.start();
      } else {
        this.renderStats.stop();
      }
    });

    effect((onCleanup) => {
      const el = this.panelRef()?.nativeElement;
      if (!el) return;
      placeWidget(this.layout, WIDGET_RENDER_STATS, el, () => ({ left: 8, top: 96 }));
      onCleanup(() => rememberWidget(this.layout, WIDGET_RENDER_STATS, el));
    });
  }

  protected millis(value: number): string {
    return value.toFixed(1);
  }

  protected rememberSpot(): void {
    const el = this.panelRef()?.nativeElement;
    if (el) rememberWidget(this.layout, WIDGET_RENDER_STATS, el);
  }

  protected reset(): void {
    this.renderStats.reset();
  }

  protected close(): void {
    this.widgets.renderStats.set(false);
  }

  private counterOf(key: string): number {
    return this.stats().counters.get(key) ?? 0;
  }
}
