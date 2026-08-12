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
import { CardTargetService } from '@axe/application/card/card-target.service';
import { EffectPlaybackService } from '@axe/application/effect/effect-playback.service';
import { EffectTargetingService } from '@axe/application/effect/effect-targeting.service';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { ImageService } from '@axe/application/storage/image.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { VisionService } from '@axe/application/tabletop/vision.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/application/ui/context-menu.service';
import { MobileLayoutService } from '@axe/application/ui/mobile-layout.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PanelService } from '@axe/application/ui/panel.service';
import { SelectionSignalService } from '@axe/application/ui/selection-signal.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerCoordinate } from '@axe/core/input/pointer-device.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { isTypingTarget } from '@axe/core/input/typing-target';
import { ImageFile, imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { FilterType, GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { SurfaceDims } from '@axe/domain/tabletop/surface-space';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { surfaceOf, TABLE_SURFACES, TableSurface } from '@axe/domain/tabletop/tabletop-object';
import { WallFace, WallLight, WallSilhouette } from '@axe/domain/tabletop/vision-scene';
import { CardComponent } from '@axe/features/card/card/card.component';
import { CardStackComponent } from '@axe/features/card/card-stack/card-stack.component';
import type { DeckBuilderResult } from '@axe/features/card/deck-builder-dialog/deck-builder-dialog.component';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
import { GameCharacterGeneratorComponent } from '@axe/features/character/game-character-generator/game-character-generator.component';
import { CoinComponent } from '@axe/features/coin/coin/coin.component';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { EffectTargetOverlayComponent } from '@axe/features/effect/effect-target-overlay/effect-target-overlay.component';
import { TableEffectOverlayComponent } from '@axe/features/effect/table-effect-overlay/table-effect-overlay.component';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
import { ReplayRouteOverlayComponent } from '@axe/features/replay/replay-route-overlay/replay-route-overlay.component';
import { beamTopGridGeometry, beamWallFaceGrid } from '@axe/features/tabletop/game-table/beam-top-grid';
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
import { LightSourceComponent } from '@axe/features/tabletop/light-source/light-source.component';
import { RangeComponent } from '@axe/features/tabletop/range/range.component';
import { TableBeamOverlayComponent } from '@axe/features/tabletop/table-beam-overlay/table-beam-overlay.component';
import { TableTargetOverlayComponent } from '@axe/features/tabletop/table-target-overlay/table-target-overlay.component';
import { TableVisionOverlayComponent } from '@axe/features/tabletop/table-vision-overlay/table-vision-overlay.component';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
import { TextNoteComponent } from '@axe/features/tabletop/text-note/text-note.component';
import {
  wallLightLayerStyle,
  wallSilhouetteBackground,
  wallSilhouetteStyle,
} from '@axe/features/tabletop/wall-projection';
import { TooltipDirective } from '@axe/ui/directives/tooltip.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { TranslocoModule } from '@jsverse/transloco';

/** 入力欄で打っている最中かどうか。盤面のキー操作が横取りしないための判定。 */
interface ActiveWall {
  surface: TableSurface;
  image: ImageFile;
  containerClass: string;
  containerTransform: string;
  containerOrigin: string;
  widthPx: number;
  heightPx: number;
  surfaceBackground: string;
  surfaceBackgroundSize: string;
  surfaceBackgroundRepeat: string;
}

interface BeamTopGrid {
  identifier: string;
  left: number;
  top: number;
  width: number;
  height: number;
  z: number;
  dataUrl: string;
}

interface BeamWallGrid {
  identifier: string;
  matrix3d: string;
  width: number;
  height: number;
  dataUrl: string;
}

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
    TableVisionOverlayComponent,
    TableBeamOverlayComponent,
    TableTargetOverlayComponent,
    TableEffectOverlayComponent,
    EffectTargetOverlayComponent,
    ReplayRouteOverlayComponent,
    CoinComponent,
    TranslocoModule,
    LightSourceComponent,
  ],
  host: {
    class: 'block',
    '(contextmenu)': 'onContextMenu($event)',
    '(document:mousedown)': 'onDocumentMouseDown($event)',
    '(document:touchstart)': 'onDocumentTouchStart($event)',
    '(document:contextmenu)': 'onDocumentContextMenu($event)',
    '(document:keydown.escape)': 'onEscapeKey($event)',
    '(document:keydown.enter)': 'onEnterKey($event)',
  },
})
export class GameTableComponent {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly imageService = inject(ImageService);
  private readonly tabletopService = inject(TabletopService);
  private readonly tabletopActionService = inject(TabletopActionService);
  protected readonly visionService = inject(VisionService);
  private readonly modalService = inject(ModalService);
  private readonly panelService = inject(PanelService);
  private readonly objectStore = inject(ObjectStore);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly cardTargetService = inject(CardTargetService);
  private readonly effectTargetingService = inject(EffectTargetingService);
  private readonly effectPlaybackService = inject(EffectPlaybackService);
  private readonly mobileLayout = inject(MobileLayoutService);
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
      gridShow: table.gridShow,
    };
  });

  readonly activeWalls = computed<readonly ActiveWall[]>(() => {
    const state = this.wallState();
    const table = this.watchCurrentTable();
    const grid = (
      widthPx: number,
      heightPx: number,
      prefix: string,
      matrix: readonly [number, number, number, number] | null
    ) => (state.gridShow ? this.wallGridDataUrl(widthPx, heightPx, table, prefix, matrix) : '');
    const walls = [] as ActiveWall[];
    const north = this.northWallImage();
    if (state.showNorth && north.url) {
      walls.push({
        surface: 'north-wall',
        image: north,
        containerClass: 'top-0 left-0',
        containerTransform: 'translateY(-100%) rotateX(90deg) rotateZ(180deg) scaleX(-1)',
        containerOrigin: '50% 100%',
        widthPx: state.widthPx,
        heightPx: state.heightPx,
        ...this.wallBackground(north.url, grid(state.widthPx, state.heightPx, 'N', null)),
      });
    }
    const south = this.southWallImage();
    if (state.showSouth && south.url) {
      walls.push({
        surface: 'south-wall',
        image: south,
        containerClass: 'bottom-0 left-0',
        containerTransform: 'rotateX(-90deg) scaleX(-1)',
        containerOrigin: '50% 100%',
        widthPx: state.widthPx,
        heightPx: state.heightPx,
        ...this.wallBackground(south.url, grid(state.widthPx, state.heightPx, 'S', [-1, 0, 0, 1])),
      });
    }
    const west = this.westWallImage();
    if (state.showWest && west.url) {
      walls.push({
        surface: 'west-wall',
        image: west,
        containerClass: 'top-0 left-0',
        containerTransform: 'rotateZ(90deg) rotateX(-90deg) scaleX(-1) translateX(-100%) translateY(-100%)',
        containerOrigin: '0% 0%',
        widthPx: state.depthPx,
        heightPx: state.heightPx,
        ...this.wallBackground(west.url, grid(state.depthPx, state.heightPx, 'W', null)),
      });
    }
    const east = this.eastWallImage();
    if (state.showEast && east.url) {
      walls.push({
        surface: 'east-wall',
        image: east,
        containerClass: 'top-0 right-0',
        containerTransform: 'rotateZ(-90deg) rotateX(-90deg) translateY(-100%) translateX(-100%) scaleX(-1)',
        containerOrigin: '100% 0%',
        widthPx: state.depthPx,
        heightPx: state.heightPx,
        ...this.wallBackground(east.url, grid(state.depthPx, state.heightPx, 'E', null)),
      });
    }
    return walls;
  });

  private wallGridDataUrl(
    widthPx: number,
    heightPx: number,
    table: GameTable,
    labelPrefix: string,
    labelMatrix: readonly [number, number, number, number] | null
  ): string {
    if (typeof document === 'undefined' || widthPx <= 0 || heightPx <= 0) return '';
    try {
      const canvas = document.createElement('canvas');
      new GridLineRender(canvas).renderViewport(
        widthPx,
        heightPx,
        table.gridSize,
        table.gridType,
        table.gridColor,
        table.gridFontColor,
        0,
        0,
        true,
        labelPrefix,
        labelMatrix
      );
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  wallBackground(
    imageUrl: string,
    gridUrl: string
  ): { surfaceBackground: string; surfaceBackgroundSize: string; surfaceBackgroundRepeat: string } {
    if (!gridUrl) {
      return {
        surfaceBackground: `url(${imageUrl})`,
        surfaceBackgroundSize: '100% 100%',
        surfaceBackgroundRepeat: 'no-repeat',
      };
    }
    return {
      surfaceBackground: `url(${gridUrl}), url(${imageUrl})`,
      surfaceBackgroundSize: '100% 100%, 100% 100%',
      surfaceBackgroundRepeat: 'no-repeat, no-repeat',
    };
  }

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
  readonly lightSources = computed(() => {
    this.objectChangeService.collectionOf('light-source')();
    return this.tabletopService.lightSources;
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
  readonly coins = computed(() => {
    this.objectChangeService.collectionOf('coin')();
    return this.tabletopService.coins;
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
  readonly coinsBySurface = computed(() => GameTableComponent.bySurface(this.coins()));
  readonly terrainsBySurface = computed(() => GameTableComponent.bySurface(this.terrains()));

  readonly beamTopGrids = computed<readonly BeamTopGrid[]>(() => {
    const table = this.currentTable;
    this.objectChangeService.versionOf(table.identifier)();
    this.objectChangeService.versionOf(this.tableSelecter.identifier)();
    if (!table.gridShow) return [];
    const grid = table.gridSize;
    const dims: SurfaceDims = {
      widthPx: table.width * grid,
      depthPx: table.height * grid,
      wallHeightPx: table.wallHeight * grid,
    };
    const result: BeamTopGrid[] = [];
    for (const terrain of this.terrains()) {
      this.objectChangeService.versionOf(terrain.identifier)();
      const geo = beamTopGridGeometry(terrain, dims, grid);
      if (!geo) continue;
      result.push({
        identifier: terrain.identifier,
        ...geo,
        dataUrl: this.beamTopGridDataUrl(geo.width, geo.height, geo.left, geo.top, table),
      });
    }
    return result;
  });

  private beamTopGridDataUrl(
    widthPx: number,
    heightPx: number,
    offsetLeftPx: number,
    offsetTopPx: number,
    table: GameTable
  ): string {
    return this.gridFaceDataUrl(widthPx, heightPx, offsetLeftPx, offsetTopPx, table, '');
  }

  readonly beamWallGrids = computed<readonly BeamWallGrid[]>(() => {
    const table = this.currentTable;
    this.objectChangeService.versionOf(table.identifier)();
    this.objectChangeService.versionOf(this.tableSelecter.identifier)();
    if (!table.gridShow) return [];
    const grid = table.gridSize;
    const dims: SurfaceDims = {
      widthPx: table.width * grid,
      depthPx: table.height * grid,
      wallHeightPx: table.wallHeight * grid,
    };
    const result: BeamWallGrid[] = [];
    for (const terrain of this.terrains()) {
      this.objectChangeService.versionOf(terrain.identifier)();
      const face = beamWallFaceGrid(terrain, dims, grid);
      if (!face) continue;
      result.push({
        identifier: terrain.identifier,
        matrix3d: face.matrix3d,
        width: face.width,
        height: face.height,
        dataUrl: this.gridFaceDataUrl(face.width, face.height, face.offsetLeft, face.offsetTop, table, face.prefix),
      });
    }
    return result;
  });

  private gridFaceDataUrl(
    widthPx: number,
    heightPx: number,
    offsetLeftPx: number,
    offsetTopPx: number,
    table: GameTable,
    prefix: string
  ): string {
    if (typeof document === 'undefined' || widthPx <= 0 || heightPx <= 0) return '';
    try {
      const canvas = document.createElement('canvas');
      new GridLineRender(canvas).renderViewport(
        widthPx,
        heightPx,
        table.gridSize,
        table.gridType,
        table.gridColor,
        table.gridFontColor,
        offsetTopPx,
        offsetLeftPx,
        true,
        prefix
      );
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  private async openDeckBuilder(position: PointerCoordinate): Promise<void> {
    const { DeckBuilderDialogComponent } =
      await import('@axe/features/card/deck-builder-dialog/deck-builder-dialog.component');
    const result = await this.modalService.open<DeckBuilderResult | null>(DeckBuilderDialogComponent);
    if (!result) return;
    if (this.tabletopActionService.createDeckFromTag(position, result.tag, result.useImageName)) {
      SoundEffect.play(PresetSound.cardPut);
    }
  }

  buildContextMenuActions(objectPosition: PointerCoordinate): ContextMenuAction[] {
    const menuActions: ContextMenuAction[] = [];

    Array.prototype.push.apply(menuActions, this.tabletopActionService.makeDefaultContextMenuActions(objectPosition));
    menuActions.push({
      name: this.t('feature.tabletop.action.createDeck'),
      action: () => {
        void this.openDeckBuilder(objectPosition);
      },
    });
    if (this.mobileLayout.isActive()) {
      menuActions.push({
        name: this.t('feature.tabletop.contextMenu.createWithOptions'),
        action: () => {
          this.panelService.open(GameCharacterGeneratorComponent, {
            width: 460,
            height: 420,
            title: this.t('common.panel.characterGenerator'),
          });
        },
      });
    }
    menuActions.push(ContextMenuSeparator);
    menuActions.push({
      name: this.t('feature.tabletop.tableSetting.title'),
      action: () => {
        this.modalService.open(GameTableSettingComponent);
      },
    });
    return menuActions;
  }

  onContextMenu(e: MouseEvent) {
    if (!document.activeElement?.contains(this.gameObjects().nativeElement)) return;
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;

    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    this.contextMenuService.open(menuPosition, this.buildContextMenuActions(objectPosition), this.currentTable.name);
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

  /** 演出の衝撃。カメラごと揺らす。 */
  readonly screenShake = computed(() => this.effectPlaybackService.shake());
  readonly screenFlash = computed(() => this.effectPlaybackService.flash());

  readonly isPickingTarget = computed(() => this.cardTargetService.isPicking());
  readonly isPickingEffectTarget = computed(() => this.effectTargetingService.isPicking());

  onEscapeKey(_e: Event) {
    if (this.effectTargetingService.cancel()) return;
    if (this.cardTargetService.cancelPicking()) return;
    this.selectionSignalService.clearSelection();
  }

  /** 対象選択中の決定。入力欄で打っている最中は横取りしない。 */
  onEnterKey(event: Event) {
    if (!this.effectTargetingService.isPicking() || isTypingTarget(event.target)) return;
    event.preventDefault();
    this.effectTargetingService.confirm();
  }

  private wallFaceFor(surface: TableSurface): WallFace | null {
    const table = this.watchCurrentTable();
    const w = table.width * table.gridSize;
    const d = table.height * table.gridSize;
    const hpx = table.wallHeight * table.gridSize;
    switch (surface) {
      case 'north-wall':
        return { ax: 0, ay: 0, bx: w, by: 0, nx: 0, ny: 1, heightPx: hpx };
      case 'south-wall':
        return { ax: 0, ay: d, bx: w, by: d, nx: 0, ny: -1, heightPx: hpx };
      case 'west-wall':
        return { ax: 0, ay: 0, bx: 0, by: d, nx: 1, ny: 0, heightPx: hpx };
      case 'east-wall':
        return { ax: w, ay: 0, bx: w, by: d, nx: -1, ny: 0, heightPx: hpx };
      default:
        return null;
    }
  }

  protected wallBaseFilter(): string | null {
    const brightness = this.visionService.ambientBrightness();
    return brightness < 1 ? 'brightness(' + brightness.toFixed(3) + ')' : null;
  }

  protected wallSilhouettesFor(surface: TableSurface): WallSilhouette[] {
    const face = this.wallFaceFor(surface);
    return face ? this.visionService.wallSilhouettes(face) : [];
  }

  protected wallPoolsFor(surface: TableSurface): WallLight[] {
    const face = this.wallFaceFor(surface);
    return face ? this.visionService.wallLights(face) : [];
  }

  protected wallPoolStyleFor(pool: WallLight, surface: TableSurface, faceLen: number): Record<string, string> {
    const mirror = surface === 'south-wall' || surface === 'east-wall';
    return wallLightLayerStyle(pool, mirror, faceLen);
  }

  protected wallSilhouetteBg(silhouette: WallSilhouette): string {
    return wallSilhouetteBackground(silhouette);
  }

  protected wallSilhouetteStyleFor(
    silhouette: WallSilhouette,
    surface: TableSurface,
    faceLen: number
  ): Record<string, string> {
    const mirror = surface === 'south-wall' || surface === 'east-wall';
    return wallSilhouetteStyle(silhouette, mirror, faceLen);
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
