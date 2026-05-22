import { NgStyle } from '@angular/common';
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
  viewChildren,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { buildOverlapContextMenu } from '@axe/application/ui/overlap-context-menu';
import { PanelOption, PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { TabletopOverlapService } from '@axe/application/ui/tabletop-overlap.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { isFlatTopGrid, isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { SlopeDirection, Terrain } from '@axe/domain/tabletop/terrain';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render';
import {
  computeHexSlopeSteps,
  HexSlopeStepData,
  HexSlopeStepFloor,
} from '@axe/features/tabletop/terrain/hex-slope-step-geometry';
import { buildTerrainContextMenu } from '@axe/features/tabletop/terrain/terrain-context-menu';
import { InputHandler } from '@axe/ui/directives/input-handler';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { RotableOption } from '@axe/ui/directives/rotable.directive';
import { RotableDirective } from '@axe/ui/directives/rotable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { buildHexRingClipPath, calcHexFlowerParams, HexFlowerParams } from '@axe/ui/tabletop/hex-pedestal-geometry';
import { translateZCss, Z_OFFSET_TABLETOP_OBJECT_PX } from '@axe/ui/tabletop/z-offset';

interface TerrainGridBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface TerrainGridViewport extends TerrainGridBounds {
  canvasLeft: number;
  canvasTop: number;
  canvasWidth: number;
  canvasHeight: number;
  offsetLeft: number;
  offsetTop: number;
}

@Component({
  selector: 'terrain',
  templateUrl: './terrain.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgStyle, SafePipe],
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
  private readonly tabletopOverlap = inject(TabletopOverlapService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateFn = inject(TRANSLATE_FN);

  constructor() {
    effect(() => {
      this.uiSignalService.terrainGridShowVersion();
      let opacity: number = 0.0;
      if (this.terrain().isGrid) {
        opacity = 1.0;
      }
      this.setGridCanvasOpacity(opacity);
    });
    effect(() => {
      this.uiSignalService.terrainGridEndVersion();
      let opacity: number = 0.0;
      if (this.terrain().isGrid) {
        if (this.tableSelecter.viewTable?.gridShow) {
          opacity = 1.0;
        }
      }
      this.setGridCanvasOpacity(opacity);
    });
    effect(() => {
      const gridCanvases = this.gridCanvases();
      if (!this._initialized || gridCanvases.length < 1) return;
      this.setGameTableGrid(
        this.width(),
        this.depth(),
        this.gridSize,
        this.currentTable.gridType,
        this.currentTable.gridColor,
        this.currentTable.gridFontColor
      );
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
    this.objectChange.onObjectChangedFor(
      // input.required guarded by _initialized to avoid NG0950 during construction.
      () => {
        if (!this._initialized) return [];
        return [this.currentTable.identifier, this.tableSelecter.identifier, this.terrain().identifier];
      },
      () => {
        if (!this._initialized) return;
        this.setGameTableGrid(
          this.width(),
          this.depth(),
          this.gridSize,
          this.currentTable.gridType,
          this.currentTable.gridColor,
          this.currentTable.gridFontColor
        );
      },
      this.destroyRef
    );
    afterNextRender(() => {
      this._initialized = true;
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
  readonly gridCanvases = viewChildren<ElementRef<HTMLCanvasElement>>('gridCanvas');

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
  readonly terrainRotate = computed(() => {
    this.terrainVersion();
    return this.terrain().rotate;
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

  readonly isHexSlope = computed(() => this.isHex() && this.isSlope() && this.slopeDirection() !== SlopeDirection.NONE);

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

  readonly hexFloorClipPath = computed<string | null>(() => {
    const params = this.pedestalHexParams();
    if (!params) return null;
    const { outline, bbox } = params;
    const W = bbox.maxX - bbox.minX;
    const H = bbox.maxY - bbox.minY;
    const points = outline
      .map((v) => {
        const px = v.x - bbox.minX;
        const py = v.y - bbox.minY;
        return `${((px / W) * 100).toFixed(2)}% ${((py / H) * 100).toFixed(2)}%`;
      })
      .join(', ');
    return `polygon(${points})`;
  });

  readonly hexFloorDimStyle = computed<Record<string, string>>(() => {
    const bounds = this.getFloorBounds();
    if (!this.pedestalHexParams()) return {} as Record<string, string>;
    return {
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
    };
  });

  readonly terrainGridClipStyle = computed<Record<string, string>>(() => this.makeTerrainGridClipStyle());

  terrainGridClipStepStyle(step: HexSlopeStepFloor): Record<string, string> {
    return this.makeTerrainGridClipStyle(step);
  }

  private makeTerrainGridClipStyle(step?: HexSlopeStepFloor): Record<string, string> {
    const bounds = this.getFloorBounds();
    const clipPath = this.hexFloorClipPath();
    const transform =
      step != null
        ? 'translateZ(' + step.heightPx + 'px)'
        : 'translateZ(' + (this.height() / (this.isSlope() ? 2 : 1)) * this.gridSize + 'px)' + this.floorModCss();
    const style: Record<string, string> = {
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      'backface-visibility': this.isSlope() ? 'visible' : 'hidden',
      transform,
      filter: 'brightness(' + this.floorBrightness() + ')',
    };
    if (step != null) {
      style['-webkit-mask'] = step.mask;
      style.mask = step.mask;
    } else {
      style['clip-path'] = clipPath ?? 'none';
    }
    return style;
  }

  readonly terrainGridCanvasStyle = computed<Record<string, string>>(() => {
    const viewport = this.getGridViewport(this.getFloorBounds());
    return {
      width: `${viewport.canvasWidth}px`,
      height: `${viewport.canvasHeight}px`,
      left: `${viewport.canvasLeft}px`,
      top: `${viewport.canvasTop}px`,
      'backface-visibility': this.isSlope() ? 'visible' : 'hidden',
      transform: `rotateZ(${-this.terrainRotate()}deg) ${translateZCss(Z_OFFSET_TABLETOP_OBJECT_PX)}`,
    };
  });

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

        const brightness = useSurfaceShading
          ? Math.max(0.3, Math.min(1.0, 0.65 - 0.35 * Math.cos(edgeAngle) + 0.15 * Math.sin(edgeAngle)))
          : 1.0;

        return {
          edgeLength: edgeLength + 1,
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
  private _initialized = false;
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
    const overlapEntries = buildOverlapContextMenu(
      this.tabletopOverlap,
      this.terrain(),
      menuPosition.x,
      menuPosition.y,
      this.translateFn
    );
    const menuArray = buildTerrainContextMenu(
      this.terrain()!,
      this.gridSize,
      objectPosition,
      this.inventoryService,
      this.tabletopActionService,
      (terrain) => this.showDetail(terrain),
      this.translateFn,
      overlapEntries
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
    if (this.isHex()) return '';
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

  private getFloorBounds(width: number = this.width(), depth: number = this.depth()): TerrainGridBounds {
    const params = this.pedestalHexParams();
    if (!params) {
      return {
        left: 0,
        top: 0,
        width: width * this.gridSize,
        height: depth * this.gridSize,
      };
    }
    const { bbox } = params;
    const containerW = width * this.gridSize;
    const containerH = depth * this.gridSize;
    return {
      left: containerW / 2 + bbox.minX,
      top: containerH / 2 + bbox.minY,
      width: bbox.maxX - bbox.minX,
      height: bbox.maxY - bbox.minY,
    };
  }

  private getGridViewport(bounds: TerrainGridBounds): TerrainGridViewport {
    const radians = (this.terrainRotate() * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const canvasWidth = Math.max(1, bounds.width * cos + bounds.height * sin);
    const canvasHeight = Math.max(1, bounds.width * sin + bounds.height * cos);
    const canvasLeft = (bounds.width - canvasWidth) / 2;
    const canvasTop = (bounds.height - canvasHeight) / 2;

    return {
      ...bounds,
      canvasLeft,
      canvasTop,
      canvasWidth,
      canvasHeight,
      offsetLeft: this.terrain().location.x + bounds.left + canvasLeft,
      offsetTop: this.terrain().location.y + bounds.top + canvasTop,
    };
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: Terrain) {
    this.selectionSignalService.selectObject(gameObject.identifier, gameObject.aliasName);
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = this.translateFn('feature.tabletop.panel.terrain');
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
    depth: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6',
    gridFontColor: string = gridColor
  ) {
    const viewport = this.getGridViewport(this.getFloorBounds(width, depth));

    for (const gridCanvas of this.gridCanvases()) {
      const render = new GridLineRender(gridCanvas.nativeElement);
      render.renderViewport(
        viewport.canvasWidth,
        viewport.canvasHeight,
        gridSize,
        gridType,
        gridColor,
        gridFontColor,
        viewport.offsetTop,
        viewport.offsetLeft
      );
    }
    let opacity: number = 0.0;
    setTimeout(() => {
      if (this.terrain().isGrid) {
        if (this.tableSelecter.viewTable?.gridShow) {
          opacity = 1.0;
        }
      }
      this.setGridCanvasOpacity(opacity);
    }, 0);
  }

  private setGridCanvasOpacity(opacity: number) {
    for (const gridCanvas of this.gridCanvases()) {
      gridCanvas.nativeElement.style.opacity = opacity + '';
    }
  }
}
