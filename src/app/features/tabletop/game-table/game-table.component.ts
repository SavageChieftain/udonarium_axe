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
  viewChild,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageFile, imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { FilterType, GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { surfaceOf, TABLE_SURFACES, TableSurface } from '@axe/domain/tabletop/tabletop-object';
import { CardComponent } from '@axe/features/card/card/card.component';
import { CardStackComponent } from '@axe/features/card/card-stack/card-stack.component';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
import { GameTableGestureService } from '@axe/features/tabletop/game-table/game-table-gesture.service';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render';
import { TableMarqueeOverlayComponent } from '@axe/features/tabletop/game-table/table-marquee-overlay/table-marquee-overlay.component';
import { GameTableMaskComponent } from '@axe/features/tabletop/game-table-mask/game-table-mask.component';
import {
  buildHexOuterBorderSvg,
  buildHexOutlineMask,
  computeHexMaskGeometry,
} from '@axe/features/tabletop/game-table-mask/game-table-mask-helpers';
import { GameTableScratchMaskComponent } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { RangeComponent } from '@axe/features/tabletop/range/range.component';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
import { TextNoteComponent } from '@axe/features/tabletop/text-note/text-note.component';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-table',
  templateUrl: './game-table.component.html',
  providers: [GameTableGestureService],
  imports: [
    NgClass,
    TerrainComponent,
    GameTableMaskComponent,
    GameTableScratchMaskComponent,
    TextNoteComponent,
    TooltipDirective,
    NgStyle,
    CardStackComponent,
    CardComponent,
    PeerCursorComponent,
    RangeComponent,
    DiceSymbolComponent,
    GameCharacterComponent,
    SafePipe,
    TableMarqueeOverlayComponent,
  ],
  host: {
    class: 'block',
    '(contextmenu)': 'onContextMenu($event)',
    '(document:mousedown)': 'onDocumentMouseDown($event)',
    '(document:touchstart)': 'onDocumentTouchStart($event)',
    '(document:contextmenu)': 'onDocumentContextMenu($event)',
    '(document:keydown.escape)': 'onEscapeKey($event)',
  },
})
export class GameTableComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly imageService = inject(ImageService);
  private readonly tabletopService = inject(TabletopService);
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly modalService = inject(ModalService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly objectChangeService = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly t = inject(TRANSLATE_FN);
  private _initialized = false;
  private _lastTableId: string | null = null;
  readonly gestureService = inject(GameTableGestureService);

  constructor() {
    effect(() => {
      this.selectionSignalService.cancelTableGestureVersion();
      this.gestureService.cancelInput();
    });
    effect(() => {
      const focus = this.selectionSignalService.focusCoordinate();
      if (!focus || !this.gameTable) return;
      setTimeout(() => {
        this.gameTable().nativeElement.style.transition = '0.2s ease-out';
        setTimeout(() => {
          this.gameTable().nativeElement.style.transition = '';
        }, 100);
        const center = this.tableVisualCenter();
        const centerX = center.x;
        const centerY = center.y;
        const movedX = focus.x - centerX;
        const movedY = focus.y - centerY;
        const rotateZRad = (this.gestureService.viewRotateZ / 180) * Math.PI;
        const rotatedMovedX = movedX * Math.cos(rotateZRad) - movedY * Math.sin(rotateZRad);
        const zRotatedMovedY = movedX * Math.sin(rotateZRad) + movedY * Math.cos(rotateZRad);
        const rotateXRad = (this.gestureService.viewRotateX / 180) * Math.PI;
        const rotatedMovedY = zRotatedMovedY * Math.cos(rotateXRad);
        const rotatedMovedZ = zRotatedMovedY * Math.sin(rotateXRad);
        this.gestureService.setTransform(
          100 - rotatedMovedX - this.gestureService.viewPositionX,
          -rotatedMovedY - this.gestureService.viewPositionY,
          -rotatedMovedZ - this.gestureService.viewPositionZ,
          0,
          0,
          0
        );
      }, 50);
    });

    this.objectChangeService.onObjectChangedFor(
      // initialize 前は currentTable / tableSelecter の参照が未確定の可能性があるためガード。
      () => (this._initialized ? [this.currentTable.identifier, this.tableSelecter.identifier] : []),
      () => {
        if (!this._initialized) return;
        const id = this.currentTable.identifier;
        if (this._lastTableId !== null && this._lastTableId !== id) {
          this.selectionSignalService.clearSelection();
        }
        this._lastTableId = id;
        this.setGameTableGrid(
          this.currentTable.width,
          this.currentTable.height,
          this.currentTable.gridSize,
          this.currentTable.gridType,
          this.currentTable.gridColor,
          this.currentTable.gridFontColor
        );
        this.syncMode2d();
      },
      this.destroyRef
    );
    this.tabletopActionService.makeDefaultTable();
    this.tabletopActionService.makeDefaultTabletopObjects();
    this.tabletopActionService.initAprilDiceImage();

    afterNextRender(() => {
      this._initialized = true;
      this.gestureService.initialize(
        this.rootElementRef().nativeElement,
        this.gameTable().nativeElement,
        this.gameObjects().nativeElement,
        this.gridCanvas().nativeElement,
        () => this.currentTable.gridShow
      );
      this.gestureService.cancelInput();

      this.setGameTableGrid(
        this.currentTable.width,
        this.currentTable.height,
        this.currentTable.gridSize,
        this.currentTable.gridType,
        this.currentTable.gridColor,
        this.currentTable.gridFontColor
      );
      this.gestureService.setTransform(0, 0, 0, 0, 0, 0);
      this.coordinateService.tabletopOriginElement = this.gameObjects().nativeElement;
      this.syncMode2d();
    });
  }

  private syncMode2d(): void {
    const enabled = this.currentTable.mode2d;
    this.gestureService.tiltLocked = enabled;
    if (enabled) {
      this.gestureService.setTransform(0, 0, 0, 0, 0, 0);
    }
  }

  readonly rootElementRef = viewChild.required<ElementRef<HTMLElement>>('root');
  readonly gameTable = viewChild.required<ElementRef<HTMLElement>>('gameTable');
  readonly gameObjects = viewChild.required<ElementRef<HTMLElement>>('gameObjects');
  readonly gridCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('gridCanvas');

  get tableSelecter(): TableSelecter {
    return this.tabletopService.tableSelecter;
  }
  get currentTable(): GameTable {
    return this.tabletopService.currentTable;
  }

  readonly tableImage = computed(
    () => {
      this.objectChangeService.fileVersion();
      this.objectChangeService.versionOf(this.currentTable.identifier)();
      this.objectChangeService.versionOf(this.tableSelecter.identifier)();
      return this.imageService.getEmptyOr(this.currentTable.imageIdentifier);
    },
    { equal: imageFileEqual() }
  );

  private wallImageFor(getter: () => string) {
    return computed(
      () => {
        this.objectChangeService.fileVersion();
        this.objectChangeService.versionOf(this.currentTable.identifier)();
        this.objectChangeService.versionOf(this.tableSelecter.identifier)();
        return this.imageService.getEmptyOr(getter());
      },
      { equal: imageFileEqual() }
    );
  }

  readonly northWallImage = this.wallImageFor(() => this.currentTable.northWallImageIdentifier);
  readonly eastWallImage = this.wallImageFor(() => this.currentTable.eastWallImageIdentifier);
  readonly southWallImage = this.wallImageFor(() => this.currentTable.southWallImageIdentifier);
  readonly westWallImage = this.wallImageFor(() => this.currentTable.westWallImageIdentifier);

  readonly wallState = computed(() => {
    const table = this.watchCurrentTable();
    return {
      heightPx: table.wallHeight * table.gridSize,
      widthPx: table.width * table.gridSize,
      depthPx: table.height * table.gridSize,
      showNorth: table.showNorthWall,
      showEast: table.showEastWall,
      showSouth: table.showSouthWall,
      showWest: table.showWestWall,
    };
  });

  readonly activeWalls = computed<
    readonly {
      surface: TableSurface;
      image: ImageFile;
      containerClass: string;
      containerTransform: string;
      widthPx: number;
      heightPx: number;
    }[]
  >(() => {
    const state = this.wallState();
    const walls = [] as {
      surface: TableSurface;
      image: ImageFile;
      containerClass: string;
      containerTransform: string;
      widthPx: number;
      heightPx: number;
    }[];
    const north = this.northWallImage();
    if (state.showNorth && north.url) {
      walls.push({
        surface: 'north-wall',
        image: north,
        containerClass: 'bottom-full left-0 origin-[50%_100%]',
        containerTransform: 'rotateX(-90deg)',
        widthPx: state.widthPx,
        heightPx: state.heightPx,
      });
    }
    const south = this.southWallImage();
    if (state.showSouth && south.url) {
      walls.push({
        surface: 'south-wall',
        image: south,
        containerClass: 'top-full left-0 origin-[50%_0%]',
        containerTransform: 'rotateX(90deg)',
        widthPx: state.widthPx,
        heightPx: state.heightPx,
      });
    }
    const west = this.westWallImage();
    if (state.showWest && west.url) {
      walls.push({
        surface: 'west-wall',
        image: west,
        containerClass: 'top-0 right-full origin-[100%_50%]',
        containerTransform: 'rotateY(90deg)',
        widthPx: state.heightPx,
        heightPx: state.depthPx,
      });
    }
    const east = this.eastWallImage();
    if (state.showEast && east.url) {
      walls.push({
        surface: 'east-wall',
        image: east,
        containerClass: 'top-0 left-full origin-[0%_50%]',
        containerTransform: 'rotateY(-90deg)',
        widthPx: state.heightPx,
        heightPx: state.depthPx,
      });
    }
    return walls;
  });

  readonly tableSurfaceStyle = computed<Record<string, string>>(() => {
    const table = this.watchCurrentTable();
    const geo = computeHexMaskGeometry(table.width, table.height, table.gridSize, table.gridType);
    if (!geo) {
      return {
        width: '100%',
        height: '100%',
        left: '0px',
        top: '0px',
        '-webkit-mask': 'none',
        mask: 'none',
      };
    }
    const mask = buildHexOutlineMask(table.gridSize, table.gridType, table.width, table.height);
    return {
      width: `${geo.pixelW}px`,
      height: `${geo.pixelH}px`,
      left: `${-geo.offsetX}px`,
      top: `${-geo.offsetY}px`,
      '-webkit-mask': mask,
      mask,
    };
  });

  readonly tableSurfaceBorderStyle = computed<Record<string, string>>(() => {
    const table = this.watchCurrentTable();
    const background = buildHexOuterBorderSvg(table.gridSize, table.gridType, table.width, table.height);
    return { background: background || 'none' };
  });

  get backgroundImage(): ImageFile {
    return this.imageService.getEmptyOr(this.currentTable.backgroundImageIdentifier);
  }

  get backgroundFilterType(): FilterType {
    return this.currentTable.backgroundFilterType;
  }

  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }
  readonly characters = computed(() => {
    this.objectChangeService.collectionOf('character')();
    return this.tabletopService.characters;
  });
  readonly tableMasks = computed(() => {
    this.objectChangeService.collectionOf('table-mask')();
    return this.tabletopService.tableMasks;
  });
  readonly tableScratchMasks = computed(() => {
    this.objectChangeService.collectionOf('table-scratch-mask')();
    return this.tabletopService.tableScratchMasks;
  });
  readonly cards = computed(() => {
    this.objectChangeService.collectionOf('card')();
    return this.tabletopService.cards;
  });
  readonly cardStacks = computed(() => {
    this.objectChangeService.collectionOf('card-stack')();
    return this.tabletopService.cardStacks;
  });
  readonly ranges = computed(() => {
    this.objectChangeService.collectionOf('range')();
    return this.tabletopService.ranges;
  });
  readonly terrains = computed(() => {
    this.objectChangeService.collectionOf('terrain')();
    return this.tabletopService.terrains;
  });
  readonly textNotes = computed(() => {
    this.objectChangeService.collectionOf('text-note')();
    return this.tabletopService.textNotes;
  });
  readonly diceSymbols = computed(() => {
    this.objectChangeService.collectionOf('dice-symbol')();
    return this.tabletopService.diceSymbols;
  });
  readonly peerCursors = computed(() => {
    this.objectChangeService.collectionOf('PeerCursor')();
    return this.tabletopService.peerCursors;
  });

  private static bySurface<T extends { location: { surface?: TableSurface } }>(
    list: readonly T[]
  ): Record<TableSurface, T[]> {
    const result = TABLE_SURFACES.reduce(
      (acc, s) => {
        acc[s] = [];
        return acc;
      },
      {} as Record<TableSurface, T[]>
    );
    for (const item of list) result[surfaceOf(item)].push(item);
    return result;
  }

  readonly charactersBySurface = computed(() => GameTableComponent.bySurface(this.characters()));
  readonly cardsBySurface = computed(() => GameTableComponent.bySurface(this.cards()));
  readonly cardStacksBySurface = computed(() => GameTableComponent.bySurface(this.cardStacks()));
  readonly rangesBySurface = computed(() => GameTableComponent.bySurface(this.ranges()));
  readonly textNotesBySurface = computed(() => GameTableComponent.bySurface(this.textNotes()));
  readonly diceSymbolsBySurface = computed(() => GameTableComponent.bySurface(this.diceSymbols()));

  onContextMenu(e: MouseEvent) {
    if (!document.activeElement?.contains(this.gameObjects().nativeElement)) return;
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    const menuActions: ContextMenuAction[] = [];

    Array.prototype.push.apply(menuActions, this.tabletopActionService.makeDefaultContextMenuActions(objectPosition));
    menuActions.push(ContextMenuSeparator);
    menuActions.push({
      name: this.t('feature.tabletop.tableSetting.title'),
      action: () => {
        this.modalService.open(GameTableSettingComponent);
      },
    });
    this.contextMenuService.open(menuPosition, menuActions, this.currentTable.name);
  }
  onDocumentMouseDown(_e: MouseEvent) {
    this.gestureService.isTableTransformed = false;
  }

  onDocumentTouchStart(_e: TouchEvent) {
    this.gestureService.isTableTransformed = false;
  }

  onDocumentContextMenu(e: MouseEvent) {
    if (this.gestureService.isTableTransformed && !this.pointerDeviceService.isAllowedToOpenContextMenu)
      e.preventDefault();
  }

  onEscapeKey(_e: Event) {
    this.selectionSignalService.clearSelection();
  }

  private watchCurrentTable(): GameTable {
    const table = this.currentTable;
    this.objectChangeService.versionOf(table.identifier)();
    this.objectChangeService.versionOf(this.tableSelecter.identifier)();
    return table;
  }

  private tableVisualCenter(): { x: number; y: number } {
    const table = this.currentTable;
    const geo = computeHexMaskGeometry(table.width, table.height, table.gridSize, table.gridType);
    if (geo) {
      return {
        x: -geo.offsetX + geo.pixelW / 2,
        y: -geo.offsetY + geo.pixelH / 2,
      };
    }
    return {
      x: this.gridCanvas().nativeElement.clientWidth / 2,
      y: this.gridCanvas().nativeElement.clientHeight / 2,
    };
  }

  private setGameTableGrid(
    width: number,
    height: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6',
    gridFontColor: string = gridColor
  ) {
    this.gameTable().nativeElement.style.width = width * gridSize + 'px';
    this.gameTable().nativeElement.style.height = height * gridSize + 'px';

    const render = new GridLineRender(this.gridCanvas().nativeElement);
    const geo = computeHexMaskGeometry(width, height, gridSize, gridType);
    if (geo) {
      render.renderViewport(
        geo.pixelW,
        geo.pixelH,
        gridSize,
        gridType,
        gridColor,
        gridFontColor,
        -geo.offsetY,
        -geo.offsetX
      );
    } else {
      render.render(width, height, gridSize, gridType, gridColor, gridFontColor);
    }

    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      const opacity: number = this.currentTable.gridShow ? 1.0 : 0.0;
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    });
  }
}
