import { NgClass, NgStyle } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageService } from '@axe/core/storage/image.service';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { SlopeDirection, Terrain } from '@axe/domain/tabletop/terrain';
import {
  buildHexRingClipPath,
  calcHexFlowerParams,
  HexFlowerParams,
} from '@axe/features/character/game-character/hex-pedestal-geometry';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render'; // 注意別のコンポーネントフォルダにアクセスしてグリッドの描画を行っている
import { computeHexSlopeSteps, HexSlopeStepData } from '@axe/features/tabletop/terrain/hex-slope-step-geometry';
import { buildTerrainContextMenu } from '@axe/features/tabletop/terrain/terrain-context-menu';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { RotableOption } from '@axe/shared/directives/rotable.directive';
import { RotableDirective } from '@axe/shared/directives/rotable.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  selector: 'terrain',
  templateUrl: './terrain.component.html',
  styles: [
    `
      .is-grab {
        cursor: -moz-grab;
        cursor: -webkit-grab;
        cursor: grab;
      }

      .is-grabbing {
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
        cursor: grabbing;
      }

      .is-3d {
        -webkit-transform-style: preserve-3d;
        transform-style: preserve-3d;
      }

      .will-change {
        will-change: opacity;
      }

      .is-transition {
        -webkit-transition: -webkit-transform 132ms linear;
        transition: transform 132ms linear;
      }

      .is-pointer-events-none {
        pointer-events: none;
      }

      .is-pointer-events-auto {
        pointer-events: auto;
      }

      .component {
        position: absolute;
        height: 50px;
        width: 50px;
        backface-visibility: hidden;
        -moz-user-select: none;
        -webkit-user-select: none;
        user-select: none;

        -moz-user-drag: none;
        -webkit-user-drag: none;
      }

      .component-content {
        height: 100%;
        width: 100%;
      }

      .texture {
        position: absolute;
        backface-visibility: hidden;
        background-repeat: no-repeat;
        background-size: 100% 100%;
        height: 100%;
        width: 100%;
      }

      .of-wall-top {
        top: 0px;
        left: 0px;

        transform-origin: 50% 100%;
        transform: translateY(-100%) rotateX(90deg) rotateZ(180deg) scaleX(-1);
        filter: brightness(0.3);
      }

      .of-wall-bottom {
        bottom: 0px;
        left: 0px;

        transform-origin: 50% 100%;
        transform: rotateX(-90deg);
      }

      .of-wall-left {
        top: 0px;
        left: 0px;

        transform-origin: 0% 0%;
        transform: rotateZ(90deg) rotateX(-90deg) scaleX(-1) translateX(-100%) translateY(-100%);
        filter: brightness(0.5);
      }

      .of-wall-right {
        top: 0px;
        right: 0px;

        transform-origin: 100% 0%;
        transform: rotateZ(-90deg) rotateX(-90deg) translateY(-100%);
        filter: brightness(0.8);
      }

      .of-wall-top.is-slope,
      .of-wall-bottom.is-slope,
      .of-wall-left.is-slope,
      .of-wall-right.is-slope {
        clip-path: polygon(100% 0%, 0% 100%, 100% 100%);
      }

      .of-wall-top.is-inverse-slope,
      .of-wall-bottom.is-inverse-slope,
      .of-wall-left.is-inverse-slope,
      .of-wall-right.is-inverse-slope {
        clip-path: polygon(0% 0%, 100% 100%, 0% 100%);
      }

      .of-wall-top.no-shadow,
      .of-wall-left.no-shadow,
      .of-wall-right.no-shadow {
        filter: brightness(1);
      }

      .pedestal-grab {
        z-index: -1;
        position: absolute;
        top: -14px;
        left: -14px;
        right: -14px;
        bottom: -14px;
        cursor: default;

        box-sizing: border-box;
        border-top: solid 7px #ccc;
        border-left: solid 7px #ccc;
        border-right: solid 7px #ccc;
        border-bottom: solid 7px #ccc;
        border-radius: 14px;
      }

      .rotate-grab {
        opacity: 0;
        z-index: -1;
      }

      .rotate-grab-icon {
        position: absolute;
        width: 28px;
        height: 28px;
        box-sizing: border-box;
        border: solid 2px #cccccc;
        cursor: -moz-default;
        cursor: -webkit-default;
        cursor: default;
        z-index: 1;
        padding: 0;
        background-color: #cccccc;
        border-radius: 100%;
        color: #444;
        font-size: 8px;

        transform-style: preserve-3d;
        transform: translateZ(0.1px);
      }

      .component:hover .rotate-grab,
      .component:active .rotate-grab {
        opacity: 1;
      }

      .of-left-top {
        top: -14px;
        left: -14px;
        border-radius: 14px 7px 14px 7px;
      }

      .of-left-bottom {
        bottom: -14px;
        left: -14px;
        border-radius: 7px 14px 7px 14px;
      }

      .of-right-bottom {
        bottom: -14px;
        right: -14px;
        border-radius: 14px 7px 14px 7px;
      }

      .of-right-top {
        top: -14px;
        right: -14px;
        border-radius: 7px 14px 7px 14px;
      }

      .hex-wall {
        position: absolute;
        left: 0;
        top: 0;
        backface-visibility: hidden;
        background-repeat: no-repeat;
        background-size: 100% 100%;
        transform-origin: 0 0;
      }

      .pedestal-grab-circle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        box-sizing: border-box;
        border-top: solid 7px #ccc;
        border-left: solid 7px #ccc;
        border-right: solid 7px #ccc;
        border-bottom: solid 7px #ccc;
        border-radius: 50%;
        transform-style: preserve-3d;
      }

      .pedestal-grab-circle .material-icons {
        position: absolute;
        top: -14px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 28px;
        color: #aaa;
        backface-visibility: hidden;
      }

      .pedestal-grab-circle .of-back {
        transform: translateX(-50%) rotateY(180deg);
      }

      .grid-canvas {
        opacity: 0;
        transform: translateZ(0.15px);
        -webkit-transition: 0.3s ease-out;
        -moz-transition: 0.3s ease-out;
        -o-transition: 0.3s ease-out;
        transition: 0.3s ease-out;
        backface-visibility: hidden;
      }

      .is-fill {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
      }

      .altitude-indicator {
        padding-left: 2px;
        font-size: 11px;
        font-weight: bolder;
        color: blanchedalmond;
        text-shadow: #444 0px 0px 3px;
        backface-visibility: hidden;
      }

      .fall {
        -webkit-transition: -webkit-transform 132ms cubic-bezier(0.21, 0.97, 0.75, 1.25);
        transition: transform 132ms cubic-bezier(0.21, 0.97, 0.75, 1.25);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, SafePipe],
  host: {
    class: 'block',
    '(dragstart)': 'onDragstart($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class TerrainComponent {
  private readonly imageService = inject(ImageService);
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panelService = inject(PanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly tabletopService = inject(TabletopService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.uiSignalService.terrainGridShowVersion();
      let opacity: number = 0.0;
      if (this.terrain().isGrid) {
        opacity = 1.0;
      }
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    });
    effect(() => {
      this.uiSignalService.terrainGridEndVersion();
      let opacity: number = 0.0;
      if (this.terrain().isGrid) {
        if (this.tableSelecter.viewTable?.gridShow) {
          opacity = 1.0;
        }
      }
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    });
    effect(() => {
      const terrain = this.terrain();
      this.movableOption.set({
        tabletopObject: terrain,
        colideLayers: ['terrain'],
      });
      this.rotableOption.set({
        tabletopObject: terrain,
      });
    });
    this.objectChange.objectChanged$.subscribe((e) => {
      if (!this.terrain()) return;
      if (
        e.identifier !== this.currentTable.identifier &&
        e.identifier !== this.tableSelecter.identifier &&
        e.identifier !== this.terrain().identifier
      )
        return;
      this.setGameTableGrid(
        this.width(),
        this.depth(),
        this.gridSize,
        this.currentTable.gridType,
        this.currentTable.gridColor,
        this.currentTable.gridFontColor
      );
    }, this.destroyRef);
    afterNextRender(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
      this.input.onStart = (e) => this.onInputStart(e);
      this.setGameTableGrid(
        this.width(),
        this.depth(),
        this.gridSize,
        this.currentTable.gridType,
        this.currentTable.gridColor,
        this.currentTable.gridFontColor
      );
    });
    this.destroyRef.onDestroy(() => {
      if (this.input) this.input.destroy();
    });
  }

  readonly terrain = input.required<Terrain>();
  readonly is3D = input(false);
  readonly gridCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gridCanvas');

  get tableSelecter(): TableSelecter {
    return this.tabletopService.tableSelecter;
  }
  get currentTable(): GameTable {
    return this.tabletopService.currentTable;
  }

  private readonly terrainVersion = computed(() => this.objectChange.versionOf(this.terrain().identifier)());

  readonly name = computed(() => {
    this.terrainVersion();
    this.objectChange.versionOf(this.currentTable.identifier)();
    this.objectChange.versionOf(this.tableSelecter.identifier)();
    return this.terrain().name;
  });
  readonly isLocked = computed(() => {
    this.terrainVersion();
    return this.terrain().isLocked;
  });
  readonly hasWall = computed(() => {
    this.terrainVersion();
    return this.terrain().hasWall;
  });
  readonly hasFloor = computed(() => {
    this.terrainVersion();
    return this.terrain().hasFloor;
  });

  readonly wallImage = computed(
    () => {
      this.objectChange.fileVersion();
      this.terrainVersion();
      return this.imageService.getSkeletonOr(this.terrain().wallImage);
    },
    { equal: imageFileEqual() }
  );
  readonly floorImage = computed(
    () => {
      this.objectChange.fileVersion();
      this.terrainVersion();
      return this.imageService.getSkeletonOr(this.terrain().floorImage);
    },
    { equal: imageFileEqual() }
  );

  readonly height = computed(() => {
    this.terrainVersion();
    return this.adjustMinBounds(this.terrain().height);
  });
  readonly width = computed(() => {
    this.terrainVersion();
    return this.adjustMinBounds(this.terrain().width);
  });
  readonly depth = computed(() => {
    this.terrainVersion();
    return this.adjustMinBounds(this.terrain().depth);
  });
  readonly altitude = computed(() => {
    this.terrainVersion();
    return this.terrain().altitude;
  });

  readonly isDropShadow = computed(() => {
    this.terrainVersion();
    return this.terrain().isDropShadow;
  });
  readonly isSurfaceShading = computed(() => {
    this.terrainVersion();
    return this.terrain().isSurfaceShading;
  });

  readonly isSlope = computed(() => {
    this.terrainVersion();
    return this.terrain().isSlope;
  });
  readonly slopeDirection = computed(() => {
    this.terrainVersion();
    const terrain = this.terrain();
    if (!terrain.isSlope) return SlopeDirection.NONE;
    if (terrain.slopeDirection === SlopeDirection.NONE) return SlopeDirection.BOTTOM;
    return terrain.slopeDirection;
  });

  readonly isAltitudeIndicate = computed(() => {
    this.terrainVersion();
    return this.terrain().isAltitudeIndicate;
  });

  readonly isVisibleFloor = computed(() => 0 < this.width() * this.depth());
  readonly isVisibleWallTopBottom = computed(() => 0 < this.width() * this.height());
  readonly isVisibleWallLeftRight = computed(() => 0 < this.depth() * this.height());

  readonly gridSize = 50;

  readonly isWallExist = computed(
    () => !!(this.hasWall() && this.wallImage() && this.wallImage().url && this.wallImage().url.length > 0)
  );

  readonly terreinAltitude = computed(() => {
    let ret = this.altitude();
    if (this.altitude() < 0 || (!this.isSlope() && !this.isWallExist())) ret += this.height();
    return ret;
  });

  readonly movableOption = signal<MovableOption>({});
  readonly rotableOption = signal<RotableOption>({});

  /** ヘクスマップ時のジオメトリパラメータ。スクエアマップ時は null。 */
  readonly pedestalHexParams = computed<HexFlowerParams | null>(() => {
    this.objectChange.versionOf(this.tabletopService.tableSelecter.identifier)();
    this.objectChange.versionOf(this.tabletopService.currentTable.identifier)();
    this.terrainVersion();
    const gridType = this.currentTable.gridType;
    if (!isHexGrid(gridType)) return null;
    const hexSize = Math.min(this.width(), this.depth());
    if (hexSize < 1) return null;
    return calcHexFlowerParams(hexSize, this.gridSize, isFlatTopGrid(gridType));
  });

  readonly isHex = computed(() => this.pedestalHexParams() !== null);

  /** ヘクスマップかつ傾斜が有効で、ステップ描画が適用可能な場合 true */
  readonly isHexSlope = computed(() => this.isHex() && this.isSlope() && this.slopeDirection() !== SlopeDirection.NONE);

  /** ヘクス傾斜の段差フロア・壁データ */
  readonly hexSlopeSteps = computed<HexSlopeStepData>(() => {
    const params = this.pedestalHexParams();
    if (!params || !this.isHexSlope()) return { floors: [], walls: [] };
    return computeHexSlopeSteps(
      Math.min(this.width(), this.depth()),
      this.gridSize,
      isFlatTopGrid(this.currentTable.gridType),
      this.slopeDirection(),
      this.height(),
      this.isSurfaceShading(),
      this.width() * this.gridSize,
      this.depth() * this.gridSize,
      params.bbox
    );
  });

  pedestalStyle(): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const { outline, bbox, L } = params;
      const W = bbox.maxX - bbox.minX;
      const H = bbox.maxY - bbox.minY;
      const clipPath = buildHexRingClipPath(outline, bbox, 7);
      return {
        background: '#ccc',
        clipPath,
        border: 'none',
        borderRadius: '0',
        width: `${W}px`,
        height: `${H}px`,
        left: `${bbox.minX + L / 2}px`,
        top: `${bbox.minY + L / 2}px`,
      };
    }
    return {};
  }

  get pedestalGrabStyle(): Record<string, string> {
    const params = this.pedestalHexParams();
    if (params) {
      const { bbox, L } = params;
      const halfW = (bbox.maxX - bbox.minX) / 2;
      const halfH = (bbox.maxY - bbox.minY) / 2;
      const radius = Math.sqrt(halfW * halfW + halfH * halfH) + 14;
      const diameter = radius * 2;
      return {
        width: `${diameter}px`,
        height: `${diameter}px`,
        left: `${L / 2 - radius}px`,
        top: `${L / 2 - radius}px`,
        borderRadius: '50%',
      };
    }
    return {};
  }

  /** ヘクスマップ時のフロアテクスチャ用クリップパス */
  readonly hexFloorClipPath = computed<string | null>(() => {
    const params = this.pedestalHexParams();
    if (!params) return null;
    const { outline, bbox } = params;
    const W = bbox.maxX - bbox.minX;
    const H = bbox.maxY - bbox.minY;
    // bbox 座標系に変換して百分率ポリゴンを生成
    const points = outline
      .map((v) => {
        const px = v.x - bbox.minX;
        const py = v.y - bbox.minY;
        return `${((px / W) * 100).toFixed(2)}% ${((py / H) * 100).toFixed(2)}%`;
      })
      .join(', ');
    return `polygon(${points})`;
  });

  /** ヘクスマップ時のフロア要素のスタイル（bbox に合わせたサイズ・位置） */
  readonly hexFloorDimStyle = computed<Record<string, string>>(() => {
    const params = this.pedestalHexParams();
    if (!params) return {} as Record<string, string>;
    const { bbox } = params;
    const containerW = this.width() * this.gridSize;
    const containerH = this.depth() * this.gridSize;
    const W = bbox.maxX - bbox.minX;
    const H = bbox.maxY - bbox.minY;
    return {
      width: `${W}px`,
      height: `${H}px`,
      left: `${containerW / 2 + bbox.minX}px`,
      top: `${containerH / 2 + bbox.minY}px`,
    };
  });

  /**
   * ヘクスマップ時の壁面ジオメトリ。
   * outline の各辺に対して壁パネルの位置・回転・明度を計算する。
   */
  readonly hexWalls = computed<{ edgeLength: number; px: number; py: number; angle: number; brightness: number }[]>(
    () => {
      const params = this.pedestalHexParams();
      if (!params) return [];
      const { outline } = params;
      const containerW = this.width() * this.gridSize;
      const containerH = this.depth() * this.gridSize;
      const useSurfaceShading = this.isSurfaceShading();

      return outline.map((v1, i) => {
        const v2 = outline[(i + 1) % outline.length];
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const edgeLength = Math.sqrt(dx * dx + dy * dy);
        const edgeAngle = Math.atan2(dy, dx);

        // 明度: 辺の外向き法線方向に基づく
        //   背面(ny=-1)=0.3, 正面(ny=1)=1.0, 左(nx=-1)=0.5, 右(nx=1)=0.8
        const brightness = useSurfaceShading
          ? Math.max(0.3, Math.min(1.0, 0.65 - 0.35 * Math.cos(edgeAngle) + 0.15 * Math.sin(edgeAngle)))
          : 1.0;

        return {
          edgeLength: edgeLength + 1, // +1px で隣接パネル間の隙間を防ぐ
          px: containerW / 2 + v2.x,
          py: containerH / 2 + v2.y,
          angle: edgeAngle + Math.PI,
          brightness,
        };
      });
    }
  );

  math = Math;
  slopeDirectionState = SlopeDirection;

  private input: InputHandler | null = null;
  readonly viewRotateZ = computed(() => this.uiSignalService.tableViewRotation()?.z ?? 10);

  onDragstart(e: DragEvent) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(_e: MouseEvent | TouchEvent) {
    this.input?.cancel();
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    const menuArray = buildTerrainContextMenu(
      this.terrain()!,
      this.gridSize,
      objectPosition,
      this.inventoryService,
      this.tabletopActionService,
      (t) => this.showDetail(t)
    );
    this.contextMenuService.open(menuPosition, menuArray, this.name());
  }

  onMove() {
    SoundEffect.play(PresetSound.blockPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.blockPut);
  }

  readonly floorModCss = computed(() => {
    if (this.isHex()) return ''; // ヘクスは段差フロアで傾斜を表現するため回転しない
    let ret = '';
    let tmp: number;
    switch (this.slopeDirection()) {
      case SlopeDirection.TOP:
        tmp = Math.atan(this.height() / this.depth());
        ret = ' rotateX(' + tmp + 'rad) scaleY(' + 1 / Math.cos(tmp) + ')';
        break;
      case SlopeDirection.BOTTOM:
        tmp = Math.atan(this.height() / this.depth());
        ret = ' rotateX(' + -tmp + 'rad) scaleY(' + 1 / Math.cos(tmp) + ')';
        break;
      case SlopeDirection.LEFT:
        tmp = Math.atan(this.height() / this.width());
        ret = ' rotateY(' + -tmp + 'rad) scaleX(' + 1 / Math.cos(tmp) + ')';
        break;
      case SlopeDirection.RIGHT:
        tmp = Math.atan(this.height() / this.width());
        ret = ' rotateY(' + tmp + 'rad) scaleX(' + 1 / Math.cos(tmp) + ')';
        break;
    }
    return ret;
  });

  readonly floorBrightness = computed(() => {
    let ret = 1.0;
    if (!this.isSurfaceShading()) return ret;
    switch (this.slopeDirection()) {
      case SlopeDirection.TOP:
        ret = 0.4;
        break;
      case SlopeDirection.BOTTOM:
        ret = 1.0;
        break;
      case SlopeDirection.LEFT:
        ret = 0.6;
        break;
      case SlopeDirection.RIGHT:
        ret = 0.9;
        break;
    }
    return ret;
  });

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: Terrain) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = '地形設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 250,
      top: coordinate.y - 150,
      width: 600,
      height: 300,
    };
    this.panelService.openLazy(
      () =>
        import('@axe/features/character/game-character-sheet/game-character-sheet.component').then(
          (m) => m.GameCharacterSheetComponent
        ),
      option,
      (component) => (component.tabletopObject = gameObject)
    );
  }

  private setGameTableGrid(
    width: number,
    height: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6',
    gridFontColor: string = gridColor
  ) {
    const render = new GridLineRender(this.gridCanvas().nativeElement);

    const leftPx = this.terrain().location.x - width / 2;
    const topPx = this.terrain().location.y - height / 2;

    render.render(width, height, gridSize, gridType, gridColor, gridFontColor, true, topPx, leftPx);
    let opacity: number = 0.0;
    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      if (this.terrain().isGrid) {
        if (this.tableSelecter.viewTable?.gridShow) {
          opacity = 1.0;
        }
      }
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    }, 0);
  }
}
