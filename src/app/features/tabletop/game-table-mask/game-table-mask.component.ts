import { NgClass, NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
} from '@angular/core';
import { CoordinateService } from '@axe/core/coordinate.service';
import { Network } from '@axe/core/index';
import { PointerDeviceService } from '@axe/core/pointer-device.service';
import { ImageFile } from '@axe/core/storage/image-file';
import { ObjectStore } from '@axe/core/sync/object-store';
import { generateUuid } from '@axe/core/util/uuid';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { GameCharacterSheetComponent } from '@axe/features/character/game-character-sheet/game-character-sheet.component';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { MovableOption } from '@axe/shared/directives/movable.directive';
import { MovableDirective } from '@axe/shared/directives/movable.directive';
import { GameObjectInventoryService } from '@axe/shared/inventory/game-object-inventory.service';
import { SafePipe } from '@axe/shared/pipes/safe.pipe';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { TabletopActionService } from '@axe/shared/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/shared/ui/context-menu.service';
import { ModalService } from '@axe/shared/ui/modal.service';
import { PanelOption, PanelService } from '@axe/shared/ui/panel.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';
import { UiSignalService } from '@axe/shared/ui/ui-signal.service';
import { xor } from 'lodash';

import { buildGameTableMaskContextMenu } from './game-table-mask-context-menu';
import { buildMaskCss, buildScratchingGridInfos } from './game-table-mask-helpers';

@Component({
  selector: 'game-table-mask',
  templateUrl: './game-table-mask.component.html',
  styleUrls: ['./game-table-mask.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, NgClass, NgStyle, SafePipe],
  host: {
    '(dragstart)': 'onDragstart($event)',
    '(pointerdown)': 'onInputStartPointer($event)',
    '(pointermove)': 'onInputMovePointer($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class GameTableMaskComponent implements OnDestroy, AfterViewInit {
  private tabletopActionService = inject(TabletopActionService);
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private objectChange = inject(ObjectChangeService);
  private panelService = inject(PanelService);
  private pointerDeviceService = inject(PointerDeviceService);
  private modalService = inject(ModalService);
  private coordinateService = inject(CoordinateService);
  private objectStore = inject(ObjectStore);
  private tableSelecter = inject(TableSelecter);
  private inventoryService = inject(GameObjectInventoryService);
  private selectionSignalService = inject(SelectionSignalService);
  private uiSignalService = inject(UiSignalService);

  constructor() {
    effect(() => {
      const mask = this.gameTableMask();
      if (!mask) return;
      this.movableOption = {
        tabletopObject: mask,
        transformCssOffset: 'translateZ(0.10px)',
        colideLayers: ['terrain'],
      };
      this.panelId = generateUuid();
    });
  }

  //  @ViewChild('elementToDetach') elementToDetach: ElementRef;

  readonly gameTableMask = input<GameTableMask | null>(null!);

  get dispLockMark(): boolean {
    return this.gameTableMask()!.dispLockMark;
  }
  set dispLockMark(disp: boolean) {
    this.gameTableMask()!.dispLockMark = disp;
  }

  get name(): string {
    this.objectChange.versionOf(this.gameTableMask()!.identifier)();
    return this.gameTableMask()!.name;
  }
  get width(): number {
    return this.adjustMinBounds(this.gameTableMask()!.width);
  }
  get height(): number {
    return this.adjustMinBounds(this.gameTableMask()!.height);
  }
  get opacity(): number {
    return this.gameTableMask()!.opacity;
  }
  get imageFile(): ImageFile {
    this.objectChange.fileVersion();
    return this.gameTableMask()!.imageFile;
  }
  get isLock(): boolean {
    return this.gameTableMask()!.isLock;
  }
  set isLock(isLock: boolean) {
    this.gameTableMask()!.isLock = isLock;
  }

  get blendType(): number {
    return 0;
  }

  get color(): string {
    return this.gameTableMask()!.color;
  }
  set color(color: string) {
    this.gameTableMask()!.color = color;
  }
  get bgcolor(): string {
    return this.gameTableMask()!.bgcolor;
  }
  set bgcolor(bgcolor: string) {
    this.gameTableMask()!.bgcolor = bgcolor;
  }

  get isPreview(): boolean {
    return this.gameTableMask()!.isPreview;
  }
  set isPreview(isPreview: boolean) {
    this.gameTableMask()!.isPreview = isPreview;
  }
  get isPreviewMode(): boolean {
    if (!this.gameTableMask()!) return false;
    return this.isPreview && this.gameTableMask()!.isMine;
    return false;
  }

  get gameTableMaskAltitude(): number {
    return +this.altitude.toFixed(1);
  }

  get scratchedGrids() {
    return this.gameTableMask()!.scratchedGrids;
  }
  set scratchedGrids(scratchedGrids: string) {
    this.gameTableMask()!.scratchedGrids = scratchedGrids;
  }

  get scratchingGrids() {
    return this.gameTableMask()!.scratchingGrids;
  }
  set scratchingGrids(scratchingGrids: string) {
    this.gameTableMask()!.scratchingGrids = scratchingGrids;
  }

  get isNonScratched(): boolean {
    return !this.gameTableMask()!.scratchedGrids;
  }

  get isNonScratching(): boolean {
    return !(this.gameTableMask()!.scratchingGrids || this._currentScratchingSet);
  }

  get masksCss(): string {
    return buildMaskCss({
      currentScratchingSet: this._currentScratchingSet,
      gridSize: this.gridSize,
      height: this.height,
      isNonScratched: this.isNonScratched,
      isPreviewMode: this.isPreviewMode,
      scratchedGrids: this.scratchedGrids,
      scratchingGrids: this.scratchingGrids,
      width: this.width,
    });
  }

  get scratchingGridInfos(): { x: number; y: number; state: string }[] {
    return buildScratchingGridInfos({
      currentScratchingSet: this._currentScratchingSet,
      hasGameTableMask: !!this.gameTableMask(),
      height: this.height,
      isNonScratched: this.isNonScratched,
      isNonScratching: this.isNonScratching,
      scratchedGrids: this.scratchedGrids,
      scratchingGrids: this.scratchingGrids,
      width: this.width,
    });
  }

  get operateOpacity(): number {
    const ret = this.opacity * (this.gameTableMask()!.isMine ? 0.6 : 1);
    return ret < 0.4 && this.isScratching ? 0.4 : ret;
  }

  get altitude(): number {
    return this.gameTableMask()!.altitude;
  }
  set altitude(altitude: number) {
    this.gameTableMask()!.altitude = altitude;
  }

  get isAltitudeIndicate(): boolean {
    return this.gameTableMask()!.isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.gameTableMask()!.isAltitudeIndicate = isAltitudeIndicate;
  }

  //  get isGMMode(): boolean { return this.gameTableMask()!.isGMMode; }
  get isInverse(): boolean {
    return 90 < Math.abs(this.viewRotateZ()) % 360 && Math.abs(this.viewRotateZ()) % 360 < 270;
  }
  get isScratching(): boolean {
    return !!this.gameTableMask()!.owner;
  }

  get hasOwner(): boolean {
    return this.gameTableMask()!.hasOwner;
  }
  get ownerIsOnline(): boolean {
    return this.gameTableMask()!.ownerIsOnline;
  }
  get ownerName(): string {
    return this.gameTableMask()!.ownerName;
  }
  get ownerColor(): string {
    return this.gameTableMask()!.ownerColor;
  }

  panelId: string = '';

  gridSize: number = 50;
  math = Math;
  readonly viewRotateZ = computed(() => this.uiSignalService.tableViewRotation()?.z ?? 10);

  movableOption: MovableOption = {};

  private input: InputHandler = null!;

  ngAfterViewInit() {
    this.input = new InputHandler(this.elementRef.nativeElement);
    this.input.onStart = (e) => this.onInputStart(e);
    this.input.onMove = (e) => this.onInputMove(e);
  }

  ngOnDestroy() {
    if (this.input) this.input.destroy();
    clearTimeout(this._scratchingTimerId);
  }

  onDragstart(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    if (!this.isScratching || !this.gameTableMask()!.isMine) {
      this.input.cancel();
    } else if (!window.PointerEvent && (e as MouseEvent).button < 2 && (e as MouseEvent).buttons < 2) {
      this.scratching(true);
    }
    // TODO:もっと良い方法考える
    if ((this.isLock && !this.isScratching) || (this.isScratching && !this.gameTableMask()!.isMine)) {
      this.selectionSignalService.notifyDragLocked();
    }
  }

  onInputStartPointer(e: PointerEvent) {
    if (!this.isScratching || !this.gameTableMask()!.isMine) {
      //this.input.cancel();
    } else if (e.button < 2 && e.buttons < 2) {
      this.scratching(true, { offsetX: e.offsetX, offsetY: e.offsetY });
    }
  }

  private _scratchingGridX = -1;
  private _scratchingGridY = -1;
  onInputMove(_e: MouseEvent | TouchEvent) {
    if (!window.PointerEvent && this.isScratching && this.gameTableMask()!.isMine && this.input.isDragging) {
      this.scratching(false);
    }
  }

  onInputMovePointer(e: PointerEvent) {
    if (this.isScratching && this.gameTableMask()!.isMine && this.input.isDragging && e.buttons < 2) {
      this.scratching(false, { offsetX: e.offsetX, offsetY: e.offsetY });
    }
    e.stopPropagation();
    e.preventDefault();
  }

  private _currentScratchingSet: Set<string> = null!;
  private _scratchingTimerId!: ReturnType<typeof setTimeout> | undefined;
  scratching(isStart: boolean, position: { offsetX: number; offsetY: number } | null = null) {
    if (!this.gameTableMask()!.isMine) return;
    // とりあえず、本当は周辺を表示したい。
    const tableSelecter = this.tableSelecter;

    if (!tableSelecter.gridShow)
      tableSelecter.viewTable.gridClipRect = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
    //viewTable.gridHeight = this.gameTableMask()!.posZ + this.gameTableMask()!.altitude * this.gridSize + 0.5;
    let offsetX;
    let offsetY;
    if (position) {
      offsetX = position.offsetX;
      offsetY = position.offsetY;
    } else {
      const scratchingPosition = this.coordinateService.calcTabletopLocalCoordinate(
        this.pointerDeviceService.pointers[0],
        this.elementRef.nativeElement
      );
      offsetX = scratchingPosition.x - this.gameTableMask()!.location.x;
      offsetY = scratchingPosition.y - this.gameTableMask()!.location.y;
    }
    if (
      offsetX < 0 ||
      this.gameTableMask()!.width * this.gridSize <= offsetX ||
      offsetY < 0 ||
      this.gameTableMask()!.height * this.gridSize <= offsetY
    )
      return;
    const gridX = Math.floor(offsetX / this.gridSize);
    const gridY = Math.floor(offsetY / this.gridSize);

    if (!isStart && this._scratchingGridX === gridX && this._scratchingGridY === gridY) return;
    const tempScratching = `${gridX}:${gridY}`;
    this._scratchingGridX = gridX;
    this._scratchingGridY = gridY;
    if (!this._currentScratchingSet) this._currentScratchingSet = new Set(this.scratchingGrids.split(/,/g));
    if (this._currentScratchingSet.has(tempScratching)) {
      this._currentScratchingSet.delete(tempScratching);
    } else {
      this._currentScratchingSet.add(tempScratching);
    }
    clearTimeout(this._scratchingTimerId);
    this._scratchingTimerId = setTimeout(() => {
      this.scratchingGrids = Array.from(this._currentScratchingSet)
        .filter((grid) => grid && /^\d+:\d+$/.test(grid))
        .sort()
        .join(',');
      this._currentScratchingSet = null!;
    }, 250);
  }

  scratched() {
    const currentScratchedAry: string[] = this.scratchedGrids ? this.scratchedGrids.split(/,/g) : [];
    if (this._currentScratchingSet) {
      clearTimeout(this._scratchingTimerId);
      this.scratchingGrids = Array.from(this._currentScratchingSet)
        .filter((grid) => grid && /^\d+:\d+$/.test(grid))
        .sort()
        .join(',');
      this._currentScratchingSet = null!;
    }
    const currentScratchingAry: string[] = this.scratchingGrids.split(/,/g);
    this.scratchedGrids = xor(currentScratchedAry, currentScratchingAry)
      .filter((grid) => grid && /^\d+:\d+$/.test(grid))
      .sort()
      .join(',');
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    const menuArray = buildGameTableMaskContextMenu({
      mask: this.gameTableMask()!,
      gridSize: this.gridSize,
      objectPosition,
      inventoryService: this.inventoryService,
      tabletopActionService: this.tabletopActionService,
      onStartScratch: () => {
        if (this.gameTableMask()!.owner != '') {
          this.isPreview = false;
          clearTimeout(this._scratchingTimerId);
          this._currentScratchingSet = null!;
        }
        this.gameTableMask()!.owner = Network.peerContext.userId;
        this._scratchingGridX = -1;
        this._scratchingGridY = -1;
      },
      onFinishScratch: () => {
        this.scratchDone();
        this.isPreview = false;
        this.gameTableMask()!.owner = '';
      },
      onCancelScratch: () => {
        this.gameTableMask()!.owner = '';
      },
      onEdit: (m) => this.showDetail(m),
    });
    this.contextMenuService.open(menuPosition, menuArray, this.name);
  }

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
  }

  scratchDone(e: Event | null = null) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.gameTableMask()!.isMine) return false;
    this.scratched();
    this.gameTableMask()!.owner = '';
    this.scratchingGrids = '';
    this.isPreview = false;
    this._scratchingGridX = -1;
    this._scratchingGridY = -1;
    SoundEffect.play(PresetSound.cardPut);
    //    this.chatMessageService.sendOperationLog(`${ this.gameTableMask()!.name == '' ? '(無名のマップマスク)' : this.gameTableMask()!.name } のスクラッチを終了した`);
    return false;
  }

  scratchCancel(e: Event | null = null) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.gameTableMask()!.isMine && this.ownerIsOnline) return false;
    this.gameTableMask()!.owner = '';
    this.scratchingGrids = '';
    this.isPreview = false;
    this._scratchingGridX = -1;
    this._scratchingGridY = -1;
    SoundEffect.play(PresetSound.unlock);
    //    this.chatMessageService.sendOperationLog(`${ this.gameTableMask()!.name == '' ? '(無名のマップマスク)' : this.gameTableMask()!.name } のスクラッチを終了した`);
    return false;
  }

  prevent(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }

  private adjustMinBounds(value: number, min: number = 0): number {
    return value < min ? min : value;
  }

  private showDetail(gameObject: GameTableMask) {
    const coordinate = this.pointerDeviceService.pointers[0];
    let title = 'マップマスク設定';
    if (gameObject.name.length) title += ' - ' + gameObject.name;
    const option: PanelOption = {
      title: title,
      left: coordinate.x - 200,
      top: coordinate.y - 150,
      width: 400,
      height: 300,
    };
    const component = this.panelService.open<GameCharacterSheetComponent>(GameCharacterSheetComponent, option);
    component.tabletopObject = gameObject;
  }

  identify(index: number, item: { identifier?: string } | null): string | number {
    return item?.identifier ?? index;
  }
}
