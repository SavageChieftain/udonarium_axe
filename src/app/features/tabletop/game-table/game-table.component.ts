import { NgClass, NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { ImageService } from '@axe/core/storage/image.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { GameObject } from '@axe/core/sync/game-object';
import { ObjectStore } from '@axe/core/sync/object-store';
import { Card } from '@axe/domain/card/card';
import { CardStack } from '@axe/domain/card/card-stack';
import { GameCharacter } from '@axe/domain/character/game-character';
import { DiceSymbol } from '@axe/domain/dice/dice-symbol';
import { Config } from '@axe/domain/peer/config';
import { PeerCursor } from '@axe/domain/peer/peer-cursor';
import { TextNote } from '@axe/domain/shared/text-note';
import { FilterType, GameTable, GridType } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { GameTableScratchMask } from '@axe/domain/tabletop/game-table-scratch-mask';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { Terrain } from '@axe/domain/tabletop/terrain';
import { CardComponent } from '@axe/features/card/card/card.component';
import { CardStackComponent } from '@axe/features/card/card-stack/card-stack.component';
import { GameCharacterComponent } from '@axe/features/character/game-character/game-character.component';
import { DiceSymbolComponent } from '@axe/features/dice/dice-symbol/dice-symbol.component';
import { PeerCursorComponent } from '@axe/features/lobby/peer-cursor/peer-cursor.component';
import { GameTableMaskComponent } from '@axe/features/tabletop/game-table-mask/game-table-mask.component';
import { GameTableScratchMaskComponent } from '@axe/features/tabletop/game-table-scratch-mask/game-table-scratch-mask.component';
import { GameTableSettingComponent } from '@axe/features/tabletop/game-table-setting/game-table-setting.component';
import { RangeComponent } from '@axe/features/tabletop/range/range.component';
import { TerrainComponent } from '@axe/features/tabletop/terrain/terrain.component';
import { TextNoteComponent } from '@axe/shared/components/text-note/text-note.component';
import { TooltipDirective } from '@axe/shared/directives/tooltip.directive';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopService } from '@axe/shared/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';

import { GridLineRender } from './grid-line-render';
import { TableMouseGesture, TableMouseGestureEvent } from './table-mouse-gesture';
import { TableTouchGesture, TableTouchGestureEvent } from './table-touch-gesture';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'game-table',
  templateUrl: './game-table.component.html',
  styleUrls: ['./game-table.component.css'],
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
    '(contextmenu)': 'onContextMenu($event)',
    '(document:mousedown)': 'onDocumentMouseDown($event)',
    '(document:touchstart)': 'onDocumentTouchStart($event)',
    '(document:contextmenu)': 'onDocumentContextMenu($event)',
  },
})
export class GameTableComponent implements OnInit, OnDestroy, AfterViewInit {
  private contextMenuService = inject(ContextMenuService);
  private pointerDeviceService = inject(PointerDeviceService);
  private coordinateService = inject(CoordinateService);
  private imageService = inject(ImageService);
  private tabletopService = inject(TabletopService);
  private tabletopActionService = inject(TabletopActionService);
  private modalService = inject(ModalService);
  private objectStore = inject(ObjectStore);
  private selectionSignalService = inject(SelectionSignalService);
  private uiSignalService = inject(UiSignalService);
  private objectChangeService = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      this.selectionSignalService.dragLockedVersion();
      if (!this.gridCanvas) return;
      this.isTableTransformMode = true;
      this.pointerDeviceService.isDragging = false;
      let opacity: number = this.tableSelecter.gridShow ? 1.0 : 0.0;
      if (this.roomGridDispAlways) {
        opacity = 1.0;
      }
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    });
    effect(() => {
      const focus = this.selectionSignalService.focusCoordinate();
      if (!focus || !this.gameTable) return;
      setTimeout(() => {
        this.gameTable().nativeElement.style.transition = '0.2s ease-out';
        setTimeout(() => {
          this.gameTable().nativeElement.style.transition = '';
        }, 100);
        // 座標変換
        const centerX = this.gridCanvas().nativeElement.clientWidth / 2;
        const centerY = this.gridCanvas().nativeElement.clientHeight / 2;
        const movedX = focus.x - centerX;
        const movedY = focus.y - centerY;
        // z軸回転
        const rotateZRad = (this.viewRotateZ / 180) * Math.PI;
        const rotatedMovedX = movedX * Math.cos(rotateZRad) - movedY * Math.sin(rotateZRad);
        const zRotatedMovedY = movedX * Math.sin(rotateZRad) + movedY * Math.cos(rotateZRad);
        // x軸回転
        const rotateXRad = (this.viewRotateX / 180) * Math.PI;
        const rotatedMovedY = zRotatedMovedY * Math.cos(rotateXRad);
        const rotatedMovedZ = zRotatedMovedY * Math.sin(rotateXRad);
        // 移動
        this.setTransform(
          100 - rotatedMovedX - this.viewPotisonX,
          -rotatedMovedY - this.viewPotisonY,
          -rotatedMovedZ - this.viewPotisonZ,
          0,
          0,
          0
        );
      }, 50);
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

  get tableImage(): ImageFile {
    this.objectChangeService.fileVersion();
    this.objectChangeService.versionOf(this.currentTable.identifier)();
    this.objectChangeService.versionOf(this.tableSelecter.identifier)();
    return this.imageService.getSkeletonOr(this.currentTable.imageIdentifier);
  }

  get backgroundImage(): ImageFile {
    return this.imageService.getEmptyOr(this.currentTable.backgroundImageIdentifier);
  }

  get backgroundFilterType(): FilterType {
    return this.currentTable.backgroundFilterType;
  }

  get roomGridDispAlways(): boolean {
    const conf = this.objectStore.get<Config>('Config');
    return conf ? conf.roomGridDispAlways : false;
  }

  set roomGridDispAlways(disp: boolean) {
    const conf = this.objectStore.get<Config>('Config');
    if (conf) conf.roomGridDispAlways = disp;
  }

  private isTableTransformMode: boolean = false;
  private isTableTransformed: boolean = false;

  get isPointerDragging(): boolean {
    return this.pointerDeviceService.isDragging;
  }

  private viewPotisonX: number = 100;
  private viewPotisonY: number = 0;
  private viewPotisonZ: number = 0;

  private viewRotateX: number = 50;
  private viewRotateY: number = 0;
  private viewRotateZ: number = 10;

  private mouseGesture: TableMouseGesture | null = null;
  private touchGesture: TableTouchGesture | null = null;
  get characters(): GameCharacter[] {
    this.objectChangeService.collectionOf('character')();
    return this.tabletopService.characters;
  }
  get tableMasks(): GameTableMask[] {
    this.objectChangeService.collectionOf('table-mask')();
    return this.tabletopService.tableMasks;
  }
  get tableScratchMasks(): GameTableScratchMask[] {
    this.objectChangeService.collectionOf('table-scratch-mask')();
    return this.tabletopService.tableScratchMasks;
  }
  get cards(): Card[] {
    this.objectChangeService.collectionOf('card')();
    return this.tabletopService.cards;
  }
  get cardStacks(): CardStack[] {
    this.objectChangeService.collectionOf('card-stack')();
    return this.tabletopService.cardStacks;
  }
  get ranges(): RangeArea[] {
    this.objectChangeService.collectionOf('range')();
    return this.tabletopService.ranges;
  }
  get terrains(): Terrain[] {
    this.objectChangeService.collectionOf('terrain')();
    return this.tabletopService.terrains;
  }
  get textNotes(): TextNote[] {
    this.objectChangeService.collectionOf('text-note')();
    return this.tabletopService.textNotes;
  }
  get diceSymbols(): DiceSymbol[] {
    this.objectChangeService.collectionOf('dice-symbol')();
    return this.tabletopService.diceSymbols;
  }
  get peerCursors(): PeerCursor[] {
    this.objectChangeService.collectionOf('PeerCursor')();
    return this.tabletopService.peerCursors;
  }

  ngOnInit() {
    this.objectChangeService.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.identifier === this.currentTable.identifier || event.identifier === this.tableSelecter.identifier) {
        this.setGameTableGrid(
          this.currentTable.width,
          this.currentTable.height,
          this.currentTable.gridSize,
          this.currentTable.gridType,
          this.currentTable.gridColor
        );
      }
    });
    this.tabletopActionService.makeDefaultTable();
    this.tabletopActionService.makeDefaultTabletopObjects();
    this.tabletopActionService.initAprilDiceImage();
  }

  ngAfterViewInit() {
    this.initializeTableTouchGesture();
    this.initializeTableMouseGesture();
    this.cancelInput();

    this.setGameTableGrid(
      this.currentTable.width,
      this.currentTable.height,
      this.currentTable.gridSize,
      this.currentTable.gridType,
      this.currentTable.gridColor
    );
    this.setTransform(0, 0, 0, 0, 0, 0);
    this.coordinateService.tabletopOriginElement = this.gameObjects().nativeElement;
  }

  ngOnDestroy() {
    if (this.mouseGesture) this.mouseGesture.destroy();
    if (this.touchGesture) this.touchGesture.destroy();
  }

  initializeTableTouchGesture() {
    this.touchGesture = new TableTouchGesture(this.rootElementRef().nativeElement);
    this.touchGesture.onstart = () => this.onTableTouchStart();
    this.touchGesture.onend = () => this.onTableTouchEnd();
    this.touchGesture.ongesture = () => this.onTableTouchGesture();
    this.touchGesture.ontransform = (tX, tY, tZ, rX, rY, rZ, ev, src) =>
      this.onTableTouchTransform(tX, tY, tZ, rX, rY, rZ, ev, src);
  }

  initializeTableMouseGesture() {
    this.mouseGesture = new TableMouseGesture(this.rootElementRef().nativeElement);
    this.mouseGesture.onstart = (e) => this.onTableMouseStart(e);
    this.mouseGesture.onend = (e) => this.onTableMouseEnd(e);
    this.mouseGesture.ontransform = (tX, tY, tZ, rX, rY, rZ, ev, src) =>
      this.onTableMouseTransform(tX, tY, tZ, rX, rY, rZ, ev, src);
  }

  onTableTouchStart() {
    this.mouseGesture?.cancel();
  }

  onTableTouchEnd() {
    this.cancelInput();
  }

  onTableTouchGesture() {
    this.cancelInput();
  }

  onTableTouchTransform(
    transformX: number,
    transformY: number,
    transformZ: number,
    rotateX: number,
    rotateY: number,
    rotateZ: number,
    event: TableTouchGestureEvent,
    srcEvent: TouchEvent | MouseEvent | PointerEvent
  ) {
    if (!this.isTableTransformMode || document.body !== document.activeElement) return;

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu && this.contextMenuService.isShow) {
      this.contextMenuService.close();
    }

    if (srcEvent.cancelable) srcEvent.preventDefault();

    //
    const scale = (1000 + Math.abs(this.viewPotisonZ)) / 1000;
    transformX *= scale;
    transformY *= scale;
    if (80 < rotateX + this.viewRotateX) rotateX += 80 - (rotateX + this.viewRotateX);
    if (rotateX + this.viewRotateX < 0) rotateX += 0 - (rotateX + this.viewRotateX);
    if (750 < transformZ + this.viewPotisonZ) transformZ += 750 - (transformZ + this.viewPotisonZ);

    this.setTransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ);
    this.isTableTransformed = true;
  }

  onTableMouseStart(e: TouchEvent | MouseEvent | PointerEvent) {
    const me = e as MouseEvent;
    if ((me.target as HTMLElement).contains(this.gameObjects().nativeElement) || me.button === 1 || me.button === 2) {
      this.isTableTransformMode = true;
    } else {
      this.isTableTransformMode = false;
      this.pointerDeviceService.isDragging = true;
      this.gridCanvas().nativeElement.style.opacity = 1.0 + '';
      this.uiSignalService.notifyTerrainGridShow();
    }
    if (!document.activeElement?.contains(me.target as Node)) {
      this.removeSelectionRanges();
      this.removeFocus();
    }
  }

  onTableMouseEnd(_e: TouchEvent | MouseEvent | PointerEvent) {
    this.cancelInput();
    this.uiSignalService.notifyTerrainGridEnd();
  }

  onTableMouseTransform(
    transformX: number,
    transformY: number,
    transformZ: number,
    rotateX: number,
    rotateY: number,
    rotateZ: number,
    event: TableMouseGestureEvent,
    srcEvent: TouchEvent | MouseEvent | PointerEvent | KeyboardEvent
  ) {
    if (!this.isTableTransformMode || document.body !== document.activeElement) return;

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu && this.contextMenuService.isShow) {
      this.contextMenuService.close();
    }

    if ((srcEvent as Event).cancelable) (srcEvent as Event).preventDefault();

    //
    const scale = (1000 + Math.abs(this.viewPotisonZ)) / 1000;
    transformX *= scale;
    transformY *= scale;

    this.setTransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ);
    this.isTableTransformed = true;
  }

  cancelInput() {
    this.mouseGesture?.cancel();
    this.isTableTransformMode = true;
    this.pointerDeviceService.isDragging = false;
    let opacity: number = this.tableSelecter.gridShow ? 1.0 : 0.0;
    if (this.roomGridDispAlways) {
      opacity = 1.0;
    }
    this.gridCanvas().nativeElement.style.opacity = opacity + '';
  }

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
    this.isTableTransformed = false;
  }

  onDocumentTouchStart(_e: TouchEvent) {
    this.isTableTransformed = false;
  }

  onDocumentContextMenu(e: MouseEvent) {
    if (this.isTableTransformed && !this.pointerDeviceService.isAllowedToOpenContextMenu) e.preventDefault();
  }

  private setTransform(
    transformX: number,
    transformY: number,
    transformZ: number,
    rotateX: number,
    rotateY: number,
    rotateZ: number
  ) {
    this.viewRotateX += rotateX;
    this.viewRotateY += rotateY;
    this.viewRotateZ += rotateZ;

    this.viewPotisonX += transformX;
    this.viewPotisonY += transformY;
    this.viewPotisonZ += transformZ;

    if (rotateX != 0 || rotateY != 0 || rotateX != 0) {
      this.uiSignalService.notifyTableViewRotation(this.viewRotateX, this.viewRotateY, this.viewRotateZ);
    }

    this.gameTable().nativeElement.style.transform = `translateZ(${this.viewPotisonZ.toFixed(4)}px) translateY(${this.viewPotisonY.toFixed(4)}px) translateX(${this.viewPotisonX.toFixed(4)}px) rotateY(${this.viewRotateY.toFixed(4)}deg) rotateX(${this.viewRotateX.toFixed(4) + 'deg) rotateZ(' + this.viewRotateZ.toFixed(4)}deg)`;
  }

  private setGameTableGrid(
    width: number,
    height: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6'
  ) {
    this.gameTable().nativeElement.style.width = width * gridSize + 'px';
    this.gameTable().nativeElement.style.height = height * gridSize + 'px';

    const render = new GridLineRender(this.gridCanvas().nativeElement);
    render.render(width, height, gridSize, gridType, gridColor);

    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      let opacity: number = this.tableSelecter.gridShow ? 1.0 : 0.0;
      if (this.roomGridDispAlways) {
        opacity = 1.0;
      }
      this.gridCanvas().nativeElement.style.opacity = opacity + '';
    });
  }

  private removeSelectionRanges() {
    const selection = window.getSelection();
    if (!selection?.isCollapsed) {
      selection?.removeAllRanges();
    }
  }

  private removeFocus() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  trackByGameObject(index: number, gameObject: GameObject) {
    return gameObject.identifier;
  }
}
