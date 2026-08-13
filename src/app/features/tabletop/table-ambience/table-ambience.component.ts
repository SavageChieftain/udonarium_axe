import { NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { AmbienceService } from '@axe/application/tabletop/ambience.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { tryBuildMultiSelectionContextMenu } from '@axe/application/ui/multi-selection-context-menu';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ObjectStore } from '@axe/core/sync/object-store';
import {
  groundSurfaceLayer,
  groundSurfaceWash,
  groundVaporLayer,
  vaporCellsOf,
  vaporSliceCount,
} from '@axe/domain/effect/ambience/ambience-ground';
import { EffectParticleLayer } from '@axe/domain/effect/effect-particles';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { TableAmbience } from '@axe/domain/tabletop/table-ambience';
import { EffectCanvasComponent } from '@axe/features/effect/effect-canvas/effect-canvas.component';
import { buildTableAmbienceContextMenu } from '@axe/features/tabletop/table-ambience/table-ambience-context-menu';
import { TableAmbienceSettingsComponent } from '@axe/features/tabletop/table-ambience/table-ambience-settings.component';
import { MovableDirective, MovableOption } from '@axe/ui/directives/movable.directive';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { setupMovableForPiece } from '@axe/ui/tabletop/setup-tabletop-piece';
import { translateZCss, Z_OFFSET_AMBIENCE_PX } from '@axe/ui/tabletop/z-offset';

/**
 * 演出をカメラ側へ寄せる量(px)。
 * 盤面と同じ深さのままだと、コマの足元に潜って途切れて見える。
 */
const CAMERA_LIFT_PX = 8;

/** 立ち上りの 1 枚ぶん。奥行き方向に何枚か並べて厚みを出す。 */
export interface VaporSlice {
  key: string;
  layer: EffectParticleLayer;
  /** 範囲の中でこの板が立っている位置(px)。手前ほど大きい。 */
  groundY: number;
}

@Component({
  selector: 'table-ambience',
  templateUrl: './table-ambience.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgStyle, MovableDirective, SelectableDirective, TooltipDirective, EffectCanvasComponent],
  host: {
    class: 'block',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class TableAmbienceComponent {
  private readonly ambienceService = inject(AmbienceService);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly panelService = inject(PanelService);
  private readonly t = inject(TRANSLATE_FN);

  readonly ambience = input.required<TableAmbience>();
  readonly movableOption = signal<MovableOption>({});

  /** 盤面の絵と同じ深さに置くと、塗りが床に食われて消える。マスクの一枚上へ出す。 */
  protected readonly surfaceTransform = translateZCss(Z_OFFSET_AMBIENCE_PX);

  constructor() {
    setupMovableForPiece(this, { target: this.ambience, transformCssOffset: this.surfaceTransform });
  }

  /**
   * オブジェクトの版。
   *
   * 「版を読んでからオブジェクトを返す」computed を挟むと、返り値の参照が変わらないので
   * signals は下流へ変化を伝えない。版そのものを配って、各値がそれを読む。
   */
  private readonly version = computed<number>(() => this.objectChange.versionOf(this.ambience().identifier)());

  private area(): TableAmbience {
    this.version();
    return this.ambience();
  }

  readonly gridSize = computed<number>(() => this.tabletopService.gridSize());
  readonly isLock = computed<boolean>(() => this.area().isLock);
  readonly pixelWidth = computed<number>(() => Math.max(this.area().width, 1) * this.gridSize());
  readonly pixelHeight = computed<number>(() => Math.max(this.area().height, 1) * this.gridSize());

  readonly surfaceWash = computed<string>(() => {
    const area = this.area();
    return groundSurfaceWash(area.kind, area.ambienceColor, area.density);
  });

  readonly surfaceLayer = computed<EffectParticleLayer | null>(() => {
    if (!this.ambienceService.motionEnabled()) return null;
    return nonEmpty(groundSurfaceLayer(this.specOf(this.pixelWidth(), this.pixelHeight())));
  });

  /**
   * 立ち上りは奥行き方向へ何枚かに分けて立てる。
   * 広い範囲に 1 枚だけ立てると、奥のものも手前のものも同じ深さに並んで帯に見える。
   */
  readonly vaporSlices = computed<VaporSlice[]>(() => {
    if (!this.ambienceService.motionEnabled()) return [];

    const depth = this.pixelHeight();
    const unit = this.gridSize();
    const count = vaporSliceCount(depth, unit);
    const height = unit * vaporCellsOf(this.area().kind);
    const slices: VaporSlice[] = [];

    for (let index = 0; index < count; index++) {
      const layer = groundVaporLayer({
        ...this.specOf(this.pixelWidth(), height),
        sliceIndex: index,
        sliceCount: count,
      });
      if (layer.particles.length < 1) continue;
      slices.push({ key: `vapor-${index}`, layer, groundY: ((index + 0.5) / count) * depth });
    }
    return slices;
  });

  private specOf(width: number, height: number) {
    const area = this.area();
    return {
      kind: area.kind,
      color: area.ambienceColor,
      density: area.density,
      elapsed: this.ambienceService.now(),
      phase: area.phaseOffset,
      width,
      height,
      unit: this.gridSize(),
    };
  }

  /** canvas は範囲より一回り大きい。粒が枠で切られないよう、余白ぶん外へずらして置く。 */
  protected canvasStyle(layer: EffectParticleLayer): Record<string, string> {
    return {
      position: 'absolute',
      left: -layer.originX + 'px',
      top: -layer.originY + 'px',
      width: layer.width + 'px',
      height: layer.height + 'px',
      'pointer-events': 'none',
    };
  }

  /** 立ち上るものはカメラに正対させる。寝かせたままだと横へ広がってしまう。 */
  protected vaporStyle(slice: VaporSlice): Record<string, string> {
    const rotation = this.uiSignalService.tableViewRotation();
    const layer = slice.layer;
    const transform =
      `translate3d(${this.pixelWidth() / 2}px, ${slice.groundY}px, 0px)` +
      ` rotateZ(${-(rotation?.z ?? 10)}deg) rotateX(${-(rotation?.x ?? 50)}deg) rotateY(${-(rotation?.y ?? 0)}deg)` +
      ` translateZ(${CAMERA_LIFT_PX}px) translate(${-layer.originX}px, ${-layer.originY}px)`;

    return {
      position: 'absolute',
      left: '0px',
      top: '0px',
      width: layer.width + 'px',
      height: layer.height + 'px',
      'transform-origin': '0 0',
      transform,
      'pointer-events': 'none',
    };
  }

  protected onMove(): void {
    SoundEffect.play(PresetSound.cardPick);
  }

  protected onMoved(): void {
    SoundEffect.play(PresetSound.cardPut);
  }

  protected onDragstart(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
  }

  protected onContextMenu(e: Event): void {
    e.stopPropagation();
    e.preventDefault();
    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const area = this.area();
    const menuPosition = this.pointerDeviceService.pointers[0];
    const multi = tryBuildMultiSelectionContextMenu({
      self: area,
      selectionSignalService: this.selectionSignalService,
      objectStore: this.objectStore,
      t: this.t,
      gridSize: this.gridSize(),
    });
    if (multi) {
      this.contextMenuService.open(menuPosition, multi, this.t('feature.tabletop.selection.title'));
      return;
    }

    const menu = buildTableAmbienceContextMenu(area, this.gridSize(), () => this.openSettings(area), this.t);
    this.contextMenuService.open(menuPosition, menu, area.name);
  }

  private openSettings(area: TableAmbience): void {
    const coordinate = this.pointerDeviceService.pointers[0];
    const option: PanelOption = {
      title: this.t('feature.ambience.settingsTitle'),
      left: coordinate.x - 180,
      top: coordinate.y - 120,
      width: 340,
      height: 380,
    };
    const component = this.panelService.open(TableAmbienceSettingsComponent, option);
    component.target = area;
  }
}

function nonEmpty(layer: EffectParticleLayer): EffectParticleLayer | null {
  return layer.particles.length > 0 ? layer : null;
}
