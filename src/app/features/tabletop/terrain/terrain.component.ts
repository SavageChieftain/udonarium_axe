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
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { Config } from '@axe/domain/peer/config';
import { GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { SlopeDirection, Terrain } from '@axe/domain/tabletop/terrain';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render'; // 注意別のコンポーネントフォルダにアクセスしてグリッドの描画を行っている
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
  styleUrls: ['./terrain.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, RotableDirective, NgClass, NgStyle, SafePipe],
  host: {
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
        if (this.roomGridDispAlways) {
          opacity = 1.0;
        }
        if (this.tableSelecter.gridShow) {
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
        this.currentTable.gridColor
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
        this.currentTable.gridColor
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

  readonly wallImage = computed(() => {
    this.objectChange.fileVersion();
    this.terrainVersion();
    return this.imageService.getSkeletonOr(this.terrain().wallImage);
  });
  readonly floorImage = computed(() => {
    this.objectChange.fileVersion();
    this.terrainVersion();
    return this.imageService.getSkeletonOr(this.terrain().floorImage);
  });

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

  get roomGridDispAlways(): boolean {
    const conf = this.objectStore.get<Config>('Config');
    return conf ? conf.roomGridDispAlways : false;
  }

  set roomGridDispAlways(disp: boolean) {
    const conf = this.objectStore.get<Config>('Config');
    if (conf) conf.roomGridDispAlways = disp;
  }

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
    gridColor: string = '#000000e6'
  ) {
    const render = new GridLineRender(this.gridCanvas().nativeElement);

    const leftPx = this.terrain().location.x - width / 2;
    const topPx = this.terrain().location.y - height / 2;

    render.render(width, height, gridSize, gridType, gridColor, true, topPx, leftPx);
    let opacity: number = 0.0;
    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      if (this.terrain().isGrid) {
        if (this.roomGridDispAlways) {
          opacity = 1.0;
        }
        if (this.tableSelecter.gridShow) {
          opacity = 1.0;
        }
      }
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    }, 0);
  }
}
