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
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageService } from '@axe/core/storage/image.service';
import { ImageFile, imageFileEqual } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { FilterType, GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { CardComponent } from '@axe/features/card/card/card.component';
import { CardStackComponent } from '@axe/features/card/card-stack/card-stack.component';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
import { GameTableGestureService } from '@axe/features/tabletop/game-table/game-table-gesture.service';
import { GridLineRender } from '@axe/features/tabletop/game-table/grid-line-render';
import { GameTableMaskComponent } from '@axe/features/tabletop/game-table-mask/game-table-mask.component';
import { GameTableScratchMaskComponent } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { RangeComponent } from '@axe/features/tabletop/range/range.component';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
import { TextNoteComponent } from '@axe/features/tabletop/text-note/text-note.component';
import { TooltipDirective } from '@axe/shared/directives/tooltip.directive';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-table',
  templateUrl: './game-table.component.html',
  styles: [
    `
      .is-grabbing {
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
        cursor: grabbing;
      }

      .is-perspective {
        -webkit-perspective: 1000px;
        perspective: 1000px;
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

      .is-3d {
        -webkit-transform-style: preserve-3d;
        transform-style: preserve-3d;
        backface-visibility: visible;
        position: absolute;
      }

      .is-3d-2 {
        -webkit-transform-style: preserve-3d;
        transform-style: preserve-3d;
        backface-visibility: hidden;
        position: absolute;
      }

      .will-change-transform {
        /*
   * デスクトップChromeにおけるレンダリング速度改善のための定義.
   * will-changeの使用は可能な限り避けるべきであり、将来的なアップデートでレンダリング速度が改善された場合は削除を検討.
   */
        will-change: transform;
        backface-visibility: visible;
      }

      .is-pointer-events-none {
        pointer-events: none;
      }

      .dummy {
        position: absolute;
        height: 1px;
        width: 1px;
        content: '';
        will-change: opacity;
        pointer-events: none;
        transform-style: preserve-3d;
        backface-visibility: hidden;
        transform: translate3d(0, 0, 0);
      }

      .layer {
        transform-style: preserve-3d;
        position: absolute;
        pointer-events: none;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
      }

      .component {
        -moz-user-select: none;
        -webkit-user-select: none;
        user-select: none;
        -moz-user-drag: none;
        -webkit-user-drag: none;

        touch-action: manipulation;

        height: 100%;
        width: 100%;

        overflow: hidden;
      }

      .component-content {
        height: 2000px;
        width: 2000px;
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

      .game-table {
        height: 100%;
        width: 100%;
      }

      .table-image {
        backface-visibility: hidden;
        position: absolute;
        height: 100%;
        width: 100%;
        background-color: rgba(255, 255, 255, 0.15);
        background-repeat: no-repeat;
        background-size: 100% 100%;
      }

      .background-image {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: -5px;
        background-repeat: no-repeat;
        background-position: center;
        background-size: cover;
      }

      .background-image.is-filter {
        will-change: filter;
      }

      .background-image.is-filter.white {
        filter: blur(5px);
      }

      .background-image.is-filter.black {
        filter: blur(5px);
      }

      .background-image.is-filter::after {
        display: block;
        content: '';
        width: 100%;
        height: 100%;
      }

      .background-image.is-filter.white::after {
        background-color: hsl(0, 0%, 97%);
        filter: opacity(0.2);
      }

      .background-image.is-filter.black::after {
        background-color: hsl(0, 0%, 10%);
        filter: opacity(0.3);
      }
    `,
  ],
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
  ],
  host: {
    class: 'block',
    '(contextmenu)': 'onContextMenu($event)',
    '(document:mousedown)': 'onDocumentMouseDown($event)',
    '(document:touchstart)': 'onDocumentTouchStart($event)',
    '(document:contextmenu)': 'onDocumentContextMenu($event)',
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
        const centerX = this.gridCanvas().nativeElement.clientWidth / 2;
        const centerY = this.gridCanvas().nativeElement.clientHeight / 2;
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

    this.objectChangeService.objectChanged$.subscribe((event) => {
      if (event.identifier === this.currentTable.identifier || event.identifier === this.tableSelecter.identifier) {
        this.setGameTableGrid(
          this.currentTable.width,
          this.currentTable.height,
          this.currentTable.gridSize,
          this.currentTable.gridType,
          this.currentTable.gridColor,
          this.currentTable.gridFontColor
        );
      }
    }, this.destroyRef);
    this.tabletopActionService.makeDefaultTable();
    this.tabletopActionService.makeDefaultTabletopObjects();
    this.tabletopActionService.initAprilDiceImage();

    afterNextRender(() => {
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
    });
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
      name: 'テーブル設定',
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
    render.render(width, height, gridSize, gridType, gridColor, gridFontColor);

    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      const opacity: number = this.currentTable.gridShow ? 1.0 : 0.0;
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    });
  }
}
