import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';

import { Card } from '@axe/card';
import { CardStack } from '@axe/card-stack';
import { ImageFile } from '@axe/core/file-storage/image-file';
import { GameObject } from '@axe/core/synchronize-object/game-object';
import { EventSystem } from '@axe/core/system';
import { DiceSymbol } from '@axe/dice-symbol';
import { GameCharacter } from '@axe/game-character';
import { FilterType, GameTable, GridType } from '@axe/game-table';
import { GameTableMask } from '@axe/game-table-mask';
import { GameTableScratchMask } from '@axe/game-table-scratch-mask';
import { PeerCursor } from '@axe/peer-cursor';
import { TableSelecter } from '@axe/table-selecter';
import { RangeArea } from '@axe/range';
import { Terrain } from '@axe/terrain';
import { TextNote } from '@axe/text-note';

import { GameTableSettingComponent } from 'component/game-table-setting/game-table-setting.component';
import { ContextMenuAction, ContextMenuSeparator, ContextMenuService } from 'service/context-menu.service';
import { CoordinateService } from 'service/coordinate.service';
import { ImageService } from 'service/image.service';
import { ModalService } from 'service/modal.service';
import { PointerDeviceService } from 'service/pointer-device.service';
import { TabletopActionService } from 'service/tabletop-action.service';
import { TabletopService } from 'service/tabletop.service';

import { GridLineRender } from './grid-line-render';
import { TableMouseGesture, TableMouseGestureEvent } from './table-mouse-gesture';
import { TableTouchGesture, TableTouchGestureEvent } from './table-touch-gesture';

import { ObjectStore } from '@axe/core/synchronize-object/object-store';
import { Config } from '@axe/config';
import { NgClass, NgStyle } from '@angular/common';
import { TerrainComponent } from 'component/terrain/terrain.component';
import { GameTableMaskComponent } from 'component/game-table-mask/game-table-mask.component';
import { GameTableScratchMaskComponent } from 'component/game-table-scratch-mask/game-table-scratch-mask.component';
import { TextNoteComponent } from 'component/text-note/text-note.component';
import { TooltipDirective } from 'directive/tooltip.directive';
import { CardStackComponent } from 'component/card-stack/card-stack.component';
import { CardComponent } from 'component/card/card.component';
import { PeerCursorComponent } from 'component/peer-cursor/peer-cursor.component';
import { RangeComponent } from 'component/range/range.component';
import { DiceSymbolComponent } from 'component/dice-symbol/dice-symbol.component';
import { GameCharacterComponent } from 'component/game-character/game-character.component';
import { SafePipe } from 'pipe/safe.pipe';

@Component({
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
})
export class GameTableComponent implements OnInit, OnDestroy, AfterViewInit {
  private changeDetector = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private contextMenuService = inject(ContextMenuService);
  private pointerDeviceService = inject(PointerDeviceService);
  private coordinateService = inject(CoordinateService);
  private imageService = inject(ImageService);
  private tabletopService = inject(TabletopService);
  private tabletopActionService = inject(TabletopActionService);
  private modalService = inject(ModalService);

  @ViewChild('root', { static: true }) rootElementRef: ElementRef<HTMLElement>;
  @ViewChild('gameTable', { static: true }) gameTable: ElementRef<HTMLElement>;
  @ViewChild('gameObjects', { static: true }) gameObjects: ElementRef<HTMLElement>;
  @ViewChild('gridCanvas', { static: true }) gridCanvas: ElementRef<HTMLCanvasElement>;

  get tableSelecter(): TableSelecter {
    return this.tabletopService.tableSelecter;
  }
  get currentTable(): GameTable {
    return this.tabletopService.currentTable;
  }

  get tableImage(): ImageFile {
    return this.imageService.getSkeletonOr(this.currentTable.imageIdentifier);
  }

  get backgroundImage(): ImageFile {
    return this.imageService.getEmptyOr(this.currentTable.backgroundImageIdentifier);
  }

  get backgroundFilterType(): FilterType {
    return this.currentTable.backgroundFilterType;
  }

  get roomGridDispAlways(): boolean {
    const conf = ObjectStore.instance.get<Config>('Config');
    return conf ? conf.roomGridDispAlways : false;
  }

  set roomGridDispAlways(disp: boolean) {
    const conf = ObjectStore.instance.get<Config>('Config');
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

  private mouseGesture: TableMouseGesture = null!;
  private touchGesture: TableTouchGesture = null!;
  get characters(): GameCharacter[] {
    return this.tabletopService.characters;
  }
  get tableMasks(): GameTableMask[] {
    return this.tabletopService.tableMasks;
  }
  get tableScratchMasks(): GameTableScratchMask[] {
    return this.tabletopService.tableScratchMasks;
  }
  get cards(): Card[] {
    return this.tabletopService.cards;
  }
  get cardStacks(): CardStack[] {
    return this.tabletopService.cardStacks;
  }
  get ranges(): RangeArea[] {
    return this.tabletopService.ranges;
  }
  get terrains(): Terrain[] {
    return this.tabletopService.terrains;
  }
  get textNotes(): TextNote[] {
    return this.tabletopService.textNotes;
  }
  get diceSymbols(): DiceSymbol[] {
    return this.tabletopService.diceSymbols;
  }
  get peerCursors(): PeerCursor[] {
    return this.tabletopService.peerCursors;
  }

  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', (event) => {
        if (
          event.data.identifier !== this.currentTable.identifier &&
          event.data.identifier !== this.tableSelecter.identifier
        )
          return;
        console.log('UPDATE_GAME_OBJECT GameTableComponent ' + this.currentTable.identifier);
        this.setGameTableGrid(
          this.currentTable.width,
          this.currentTable.height,
          this.currentTable.gridSize,
          this.currentTable.gridType,
          this.currentTable.gridColor
        );
      })
      .on('RE_DRAW_TABLE', (_event) => {
        console.log('テーブル再描画');
        this.changeDetector.detectChanges();
        this.changeDetector.markForCheck();
      })
      .on('DRAG_LOCKED_OBJECT', (_event) => {
        this.isTableTransformMode = true;
        this.pointerDeviceService.isDragging = false;
        let opacity: number = this.tableSelecter.gridShow ? 1.0 : 0.0;
        if (this.roomGridDispAlways) {
          opacity = 1.0;
        }
        this.gridCanvas.nativeElement.style.opacity = opacity + '';
      })
      .on('FOCUS_TO_TABLETOP_COORDINATE', (event) => {
        setTimeout(() => {
          console.log(`move table to focus (${event.data.x}, ${event.data.y})`);
          this.gameTable.nativeElement.style.transition = '0.2s ease-out';
          setTimeout(() => {
            this.gameTable.nativeElement.style.transition = null!;
          }, 100);
          // 座標変換
          const centerX = this.gridCanvas.nativeElement.clientWidth / 2;
          const centerY = this.gridCanvas.nativeElement.clientHeight / 2;
          const movedX = event.data.x - centerX;
          const movedY = event.data.y - centerY;
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
    this.tabletopActionService.makeDefaultTable();
    this.tabletopActionService.makeDefaultTabletopObjects();
    this.tabletopActionService.initAprilDiceImage();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.initializeTableTouchGesture();
      this.initializeTableMouseGesture();
    });
    this.cancelInput();

    this.setGameTableGrid(
      this.currentTable.width,
      this.currentTable.height,
      this.currentTable.gridSize,
      this.currentTable.gridType,
      this.currentTable.gridColor
    );
    this.setTransform(0, 0, 0, 0, 0, 0);
    this.coordinateService.tabletopOriginElement = this.gameObjects.nativeElement;
  }

  ngOnDestroy() {
    EventSystem.unregister(this);
    if (this.mouseGesture) this.mouseGesture.destroy();
    if (this.touchGesture) this.touchGesture.destroy();
  }

  initializeTableTouchGesture() {
    this.touchGesture = new TableTouchGesture(this.rootElementRef.nativeElement, this.ngZone);
    this.touchGesture.onstart = () => this.onTableTouchStart();
    this.touchGesture.onend = () => this.onTableTouchEnd();
    this.touchGesture.ongesture = () => this.onTableTouchGesture();
    this.touchGesture.ontransform = (tX, tY, tZ, rX, rY, rZ, ev, src) =>
      this.onTableTouchTransform(tX, tY, tZ, rX, rY, rZ, ev, src);
  }

  initializeTableMouseGesture() {
    this.mouseGesture = new TableMouseGesture(this.rootElementRef.nativeElement);
    this.mouseGesture.onstart = (e) => this.onTableMouseStart(e);
    this.mouseGesture.onend = (e) => this.onTableMouseEnd(e);
    this.mouseGesture.ontransform = (tX, tY, tZ, rX, rY, rZ, ev, src) =>
      this.onTableMouseTransform(tX, tY, tZ, rX, rY, rZ, ev, src);
  }

  onTableTouchStart() {
    this.mouseGesture.cancel();
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
      this.ngZone.run(() => this.contextMenuService.close());
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
    if ((me.target as HTMLElement).contains(this.gameObjects.nativeElement) || me.button === 1 || me.button === 2) {
      this.isTableTransformMode = true;
    } else {
      this.isTableTransformMode = false;
      this.pointerDeviceService.isDragging = true;
      this.gridCanvas.nativeElement.style.opacity = 1.0 + '';
      EventSystem.trigger('DISP_TERRAIN_GRID', {});
    }
    if (!document.activeElement?.contains(me.target as Node)) {
      this.removeSelectionRanges();
      this.removeFocus();
    }
  }

  onTableMouseEnd(_e: TouchEvent | MouseEvent | PointerEvent) {
    this.cancelInput();
    EventSystem.trigger('DISP_TERRAIN_GRID_END', {});
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
      this.ngZone.run(() => this.contextMenuService.close());
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
    this.mouseGesture.cancel();
    this.isTableTransformMode = true;
    this.pointerDeviceService.isDragging = false;
    let opacity: number = this.tableSelecter.gridShow ? 1.0 : 0.0;
    if (this.roomGridDispAlways) {
      opacity = 1.0;
    }
    this.gridCanvas.nativeElement.style.opacity = opacity + '';
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: MouseEvent) {
    if (!document.activeElement?.contains(this.gameObjects.nativeElement)) return;
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
  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(_e: MouseEvent) {
    this.isTableTransformed = false;
  }

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouchStart(_e: TouchEvent) {
    this.isTableTransformed = false;
  }

  @HostListener('document:contextmenu', ['$event'])
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
      this.ngZone.run(() => {
        EventSystem.trigger('TABLE_VIEW_ROTATE', {
          x: this.viewRotateX,
          y: this.viewRotateY,
          z: this.viewRotateZ,
        });
      });
    }

    this.gameTable.nativeElement.style.transform = `translateZ(${this.viewPotisonZ.toFixed(4)}px) translateY(${this.viewPotisonY.toFixed(4)}px) translateX(${this.viewPotisonX.toFixed(4)}px) rotateY(${this.viewRotateY.toFixed(4)}deg) rotateX(${this.viewRotateX.toFixed(4) + 'deg) rotateZ(' + this.viewRotateZ.toFixed(4)}deg)`;
  }

  private setGameTableGrid(
    width: number,
    height: number,
    gridSize: number = 50,
    gridType: GridType = GridType.SQUARE,
    gridColor: string = '#000000e6'
  ) {
    this.gameTable.nativeElement.style.width = width * gridSize + 'px';
    this.gameTable.nativeElement.style.height = height * gridSize + 'px';

    const render = new GridLineRender(this.gridCanvas.nativeElement);
    render.render(width, height, gridSize, gridType, gridColor);

    setTimeout(() => {
      // 他PL操作で表示条件変更時、情報更新されてからUpdate処理をするため
      let opacity: number = this.tableSelecter.gridShow ? 1.0 : 0.0;
      if (this.roomGridDispAlways) {
        opacity = 1.0;
      }
      this.gridCanvas.nativeElement.style.opacity = opacity + '';
      console.log('グリッド描画');
    }, 0);
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
