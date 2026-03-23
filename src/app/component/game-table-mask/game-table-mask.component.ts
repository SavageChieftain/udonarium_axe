import { NgClass, NgStyle } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { ImageFile } from '@axe/class/core/file-storage/image-file';
import { ObjectStore } from '@axe/class/core/synchronize-object/object-store';
import { EventSystem, Network } from '@axe/class/core/system';
import { generateUuid } from '@axe/class/core/system/util/uuid';
import { GameTableMask } from '@axe/class/game-table-mask';
import { PresetSound, SoundEffect } from '@axe/class/sound-effect';
import { TableSelecter } from '@axe/class/table-selecter';
import { GameCharacterSheetComponent } from '@axe/component/game-character-sheet/game-character-sheet.component';
import { InputHandler } from '@axe/directive/input-handler';
import { MovableOption } from '@axe/directive/movable.directive';
import { MovableDirective } from '@axe/directive/movable.directive';
import { xor } from 'lodash';
import { SafePipe } from '@axe/pipe/safe.pipe';
import { ContextMenuSeparator, ContextMenuService } from '@axe/service/context-menu.service';
import { CoordinateService } from '@axe/service/coordinate.service';
import { ModalService } from '@axe/service/modal.service';
import { PanelOption, PanelService } from '@axe/service/panel.service';
import { PointerDeviceService } from '@axe/service/pointer-device.service';
import { TabletopActionService } from '@axe/service/tabletop-action.service';

@Component({
  selector: 'game-table-mask',
  templateUrl: './game-table-mask.component.html',
  styleUrls: ['./game-table-mask.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, NgClass, NgStyle, SafePipe],
})
export class GameTableMaskComponent implements OnChanges, OnDestroy, AfterViewInit {
  private ngZone = inject(NgZone);
  private tabletopActionService = inject(TabletopActionService);
  private contextMenuService = inject(ContextMenuService);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private panelService = inject(PanelService);
  private changeDetector = inject(ChangeDetectorRef);
  private pointerDeviceService = inject(PointerDeviceService);
  private modalService = inject(ModalService);
  private coordinateService = inject(CoordinateService);
  private objectStore = inject(ObjectStore);
  private tableSelecter = inject(TableSelecter);

  //  @ViewChild('elementToDetach') elementToDetach: ElementRef;

  @Input() gameTableMask: GameTableMask | null = null!;
  @Input() is3D: boolean = false;

  get dispLockMark(): boolean {
    return this.gameTableMask!.dispLockMark;
  }
  set dispLockMark(disp: boolean) {
    this.gameTableMask!.dispLockMark = disp;
  }

  get name(): string {
    return this.gameTableMask!.name;
  }
  get width(): number {
    return this.adjustMinBounds(this.gameTableMask!.width);
  }
  get height(): number {
    return this.adjustMinBounds(this.gameTableMask!.height);
  }
  get opacity(): number {
    return this.gameTableMask!.opacity;
  }
  get imageFile(): ImageFile {
    return this.gameTableMask!.imageFile;
  }
  get isLock(): boolean {
    return this.gameTableMask!.isLock;
  }
  set isLock(isLock: boolean) {
    this.gameTableMask!.isLock = isLock;
  }

  get blendType(): number {
    return 0;
  }

  get color(): string {
    return this.gameTableMask!.color;
  }
  set color(color: string) {
    this.gameTableMask!.color = color;
  }
  get bgcolor(): string {
    return this.gameTableMask!.bgcolor;
  }
  set bgcolor(bgcolor: string) {
    this.gameTableMask!.bgcolor = bgcolor;
  }

  get isPreview(): boolean {
    return this.gameTableMask!.isPreview;
  }
  set isPreview(isPreview: boolean) {
    this.gameTableMask!.isPreview = isPreview;
  }
  get isPreviewMode(): boolean {
    if (!this.gameTableMask!) return false;
    return this.isPreview && this.gameTableMask!.isMine;
    return false;
  }

  get gameTableMaskAltitude(): number {
    return +this.altitude.toFixed(1);
  }

  get scratchedGrids() {
    return this.gameTableMask!.scratchedGrids;
  }
  set scratchedGrids(scratchedGrids: string) {
    this.gameTableMask!.scratchedGrids = scratchedGrids;
  }

  get scratchingGrids() {
    return this.gameTableMask!.scratchingGrids;
  }
  set scratchingGrids(scratchingGrids: string) {
    this.gameTableMask!.scratchingGrids = scratchingGrids;
  }

  get isNonScratched(): boolean {
    return !this.gameTableMask!.scratchedGrids;
  }

  get isNonScratching(): boolean {
    return !(this.gameTableMask!.scratchingGrids || this._currentScratchingSet);
  }

  get masksCss(): string {
    if (!this.isPreviewMode && this.isNonScratched) return '';
    const masks: string[] = [];
    const scratchedSet: Set<string> = new Set(this.scratchedGrids.split(/,/g));
    const scratchingSet: Set<string> = this._currentScratchingSet
      ? this._currentScratchingSet
      : new Set(this.scratchingGrids.split(/,/g));
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const gridStr = `${x}:${y}`;
        if (this.isPreviewMode) {
          if (scratchedSet.has(gridStr) && !scratchingSet.has(gridStr)) continue;
          if (scratchingSet.has(gridStr) && !scratchedSet.has(gridStr)) continue;
        } else {
          if (scratchedSet.has(gridStr)) continue;
        }
        masks.push(
          `radial-gradient(#000, #000) ${x * this.gridSize - 1}px ${y * this.gridSize - 1}px / ${this.gridSize + 2}px ${this.gridSize + 2}px no-repeat`
        );
      }
    }
    return masks.length ? masks.join(',') : 'radial-gradient(#000, #000) 0px 0px / 0px 0px no-repeat';
  }

  get scratchingGridInfos(): { x: number; y: number; state: string }[] {
    const ret: { x: number; y: number; state: string }[] = [];
    if (!this.gameTableMask || (this.isNonScratching && this.isNonScratched)) return ret;
    const scratchingGridSet: Set<string> = this._currentScratchingSet
      ? this._currentScratchingSet
      : new Set(this.scratchingGrids.split(/,/g));
    const scratchedGridSet: Set<string> = new Set(this.scratchedGrids.split(/,/g));
    for (let x = 0; x < Math.ceil(this.width); x++) {
      for (let y = 0; y < Math.ceil(this.height); y++) {
        const gridStr = `${x}:${y}`;
        if (scratchingGridSet.has(gridStr) || scratchedGridSet.has(gridStr))
          ret.push({
            x: x,
            y: y,
            state: !scratchingGridSet.has(gridStr)
              ? 'scrached'
              : !scratchedGridSet.has(gridStr)
                ? 'scraching'
                : 'restore',
          });
      }
    }
    return ret;
  }

  get operateOpacity(): number {
    const ret = this.opacity * (this.gameTableMask!.isMine ? 0.6 : 1);
    return ret < 0.4 && this.isScratching ? 0.4 : ret;
  }

  get altitude(): number {
    return this.gameTableMask!.altitude;
  }
  set altitude(altitude: number) {
    this.gameTableMask!.altitude = altitude;
  }

  get isAltitudeIndicate(): boolean {
    return this.gameTableMask!.isAltitudeIndicate;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    this.gameTableMask!.isAltitudeIndicate = isAltitudeIndicate;
  }

  //  get isGMMode(): boolean { return this.gameTableMask!.isGMMode; }
  get isInverse(): boolean {
    return 90 < Math.abs(this.viewRotateZ) % 360 && Math.abs(this.viewRotateZ) % 360 < 270;
  }
  get isScratching(): boolean {
    return !!this.gameTableMask!.owner;
  }

  get hasOwner(): boolean {
    return this.gameTableMask!.hasOwner;
  }
  get ownerIsOnline(): boolean {
    return this.gameTableMask!.ownerIsOnline;
  }
  get ownerName(): string {
    return this.gameTableMask!.ownerName;
  }
  get ownerColor(): string {
    return this.gameTableMask!.ownerColor;
  }

  panelId: string = '';

  gridSize: number = 50;
  math = Math;
  viewRotateZ = 10;

  movableOption: MovableOption = {};

  private input: InputHandler = null!;

  /*
  ngOnInit() {
    EventSystem.register(this)
      .on('UPDATE_GAME_OBJECT', event => {
        let object = this.objectStore.get(event.data.identifier);
        if (!this.gameTableMask || !object) return;
        if (this.gameTableMask === object || (object instanceof ObjectNode && this.gameTableMask!.contains(object))) {
          this.changeDetector.markForCheck();
        }
      })
      .on('CHANGE_GM_MODE', event => {
        this.changeDetector.markForCheck();
      })
      .on('SYNCHRONIZE_FILE_LIST', event => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', event => {
        this.changeDetector.markForCheck();
      })
      .on<object>('TABLE_VIEW_ROTATE', -1000, event => {
        this.ngZone.run(() => {
          this.viewRotateZ = event.data['z'];
          this.changeDetector.markForCheck();
        });
      })
      .on(`UPDATE_SELECTION/identifier/${this.gameTableMask?.identifier}`, event => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.gameTableMask!,
      transformCssOffset: 'translateZ(0.10px)',
      colideLayers: ['terrain']
    };
    this.panelId = generateUuid();
  }

  ngOnChanges(): void {
  }

*/
  ngOnChanges(): void {
    EventSystem.unregister(this);
    EventSystem.register(this)
      .on(`UPDATE_GAME_OBJECT/identifier/${this.gameTableMask?.identifier}`, (_event) => {
        this.changeDetector.markForCheck();
      })
      .on(`UPDATE_OBJECT_CHILDREN/identifier/${this.gameTableMask?.identifier}`, (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('CHANGE_GM_MODE', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('SYNCHRONIZE_FILE_LIST', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on('UPDATE_FILE_RESOURE', (_event) => {
        this.changeDetector.markForCheck();
      })
      .on<{ z: number }>('TABLE_VIEW_ROTATE', -1000, (event) => {
        this.ngZone.run(() => {
          this.viewRotateZ = event.data['z'];
          this.changeDetector.markForCheck();
        });
      })
      .on(`UPDATE_SELECTION/identifier/${this.gameTableMask?.identifier}`, (_event) => {
        this.changeDetector.markForCheck();
      });
    this.movableOption = {
      tabletopObject: this.gameTableMask!,
      transformCssOffset: 'translateZ(0.10px)',
      colideLayers: ['terrain'],
    };
    this.panelId = generateUuid();
  }

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      this.input = new InputHandler(this.elementRef.nativeElement);
    });
    this.input.onStart = (e) => this.onInputStart(e);
    this.input.onMove = (e) => this.onInputMove(e);
  }

  ngOnDestroy() {
    if (this.input) this.input.destroy();
    EventSystem.unregister(this);
    clearTimeout(this._scratchingTimerId);
  }

  @HostListener('dragstart', ['$event'])
  onDragstart(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    if (!this.isScratching || !this.gameTableMask!.isMine) {
      this.input.cancel();
    } else if (!window.PointerEvent && (e as MouseEvent).button < 2 && (e as MouseEvent).buttons < 2) {
      this.scratching(true);
    }
    // TODO:もっと良い方法考える
    if ((this.isLock && !this.isScratching) || (this.isScratching && !this.gameTableMask!.isMine)) {
      EventSystem.trigger('DRAG_LOCKED_OBJECT', { srcEvent: e });
    }
  }

  @HostListener('pointerdown', ['$event'])
  onInputStartPointer(e: PointerEvent) {
    if (!this.isScratching || !this.gameTableMask!.isMine) {
      //this.input.cancel();
    } else if (e.button < 2 && e.buttons < 2) {
      this.scratching(true, { offsetX: e.offsetX, offsetY: e.offsetY });
    }
  }

  private _scratchingGridX = -1;
  private _scratchingGridY = -1;
  onInputMove(_e: MouseEvent | TouchEvent) {
    if (!window.PointerEvent && this.isScratching && this.gameTableMask!.isMine && this.input.isDragging) {
      this.scratching(false);
    }
  }

  @HostListener('pointermove', ['$event'])
  onInputMovePointer(e: PointerEvent) {
    if (this.isScratching && this.gameTableMask!.isMine && this.input.isDragging && e.buttons < 2) {
      this.scratching(false, { offsetX: e.offsetX, offsetY: e.offsetY });
    }
    e.stopPropagation();
    e.preventDefault();
  }

  private _currentScratchingSet: Set<string> = null!;
  private _scratchingTimerId!: ReturnType<typeof setTimeout> | undefined;
  scratching(isStart: boolean, position: { offsetX: number; offsetY: number } | null = null) {
    if (!this.gameTableMask!.isMine) return;
    // とりあえず、本当は周辺を表示したい。
    const tableSelecter = this.tableSelecter;

    if (!tableSelecter.gridShow)
      tableSelecter.viewTable.gridClipRect = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      };
    //viewTable.gridHeight = this.gameTableMask!.posZ + this.gameTableMask!.altitude * this.gridSize + 0.5;
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
      offsetX = scratchingPosition.x - this.gameTableMask!.location.x;
      offsetY = scratchingPosition.y - this.gameTableMask!.location.y;
    }
    if (
      offsetX < 0 ||
      this.gameTableMask!.width * this.gridSize <= offsetX ||
      offsetY < 0 ||
      this.gameTableMask!.height * this.gridSize <= offsetY
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

  @HostListener('contextmenu', ['$event'])
  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const menuPosition = this.pointerDeviceService.pointers[0];
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    const menuArray = [];
    menuArray.push(
      {
        name: '高度設定',
        action: undefined,
        subActions: [
          {
            name: '高度を0にする',
            action: () => {
              if (this.altitude != 0) {
                this.altitude = 0;
                SoundEffect.play(PresetSound.sweep);
              }
            },
            altitudeHande: this.gameTableMask!,
          },
          this.isAltitudeIndicate
            ? {
                name: '☑ 高度の表示',
                action: () => {
                  this.isAltitudeIndicate = false;
                  SoundEffect.play(PresetSound.sweep);
                  EventSystem.trigger('UPDATE_INVENTORY', null!);
                },
              }
            : {
                name: '☐ 高度の表示',
                action: () => {
                  this.isAltitudeIndicate = true;
                  SoundEffect.play(PresetSound.sweep);
                  EventSystem.trigger('UPDATE_INVENTORY', null!);
                },
              },
        ],
      },
      ContextMenuSeparator,
      this.isLock
        ? {
            name: '固定解除',
            action: () => {
              this.isLock = false;
              this.dispLockMark = true;
              SoundEffect.play(PresetSound.unlock);
            },
          }
        : {
            name: '固定する',
            action: () => {
              this.isLock = true;
              SoundEffect.play(PresetSound.lock);
            },
          }
    );
    if (this.isLock) {
      menuArray.push(
        this.dispLockMark
          ? {
              name: '固定マーク消去',
              action: () => {
                this.dispLockMark = false;
                SoundEffect.play(PresetSound.lock);
              },
            }
          : {
              name: '固定マーク表示',
              action: () => {
                this.dispLockMark = true;
                SoundEffect.play(PresetSound.lock);
              },
            }
      );
    }
    if (!this.gameTableMask!.isMine) {
      menuArray.push({
        name: 'スクラッチ開始',
        action: () => {
          if (this.gameTableMask!.owner != '') {
            this.isPreview = false;
            clearTimeout(this._scratchingTimerId);
            this._currentScratchingSet = null!;
          }
          //            this.isPreview = true;
          SoundEffect.play(PresetSound.cardDraw);
          this.gameTableMask!.owner = Network.peerContext.userId;
          this._scratchingGridX = -1;
          this._scratchingGridY = -1;
          SoundEffect.play(PresetSound.lock);
        },
      });
    } else {
      menuArray.push({
        name: 'スクラッチ確定',
        action: () => {
          this.scratchDone();
          this.isPreview = false;
          this.gameTableMask!.owner = '';
        },
      });
    }
    if (this.gameTableMask!.isMine) {
      menuArray.push({
        name: 'スクラッチキャンセル',
        action: () => {
          //              this.isScratch = false;
          SoundEffect.play(PresetSound.cardDraw);
          this.gameTableMask!.owner = '';
        },
      });
    }

    menuArray.push(ContextMenuSeparator);
    menuArray.push({
      name: 'マスクを編集',
      action: () => {
        this.showDetail(this.gameTableMask!);
      },
    });
    menuArray.push({
      name: 'コピーを作る',
      action: () => {
        const cloneObject = this.gameTableMask!.clone();
        cloneObject.location.x += this.gridSize;
        cloneObject.location.y += this.gridSize;
        cloneObject.isLock = false;
        if (this.gameTableMask!.parent) this.gameTableMask!.parent.appendChild(cloneObject);
        SoundEffect.play(PresetSound.cardPut);
      },
    });
    menuArray.push({
      name: '削除する',
      action: () => {
        this.gameTableMask!.destroy();
        SoundEffect.play(PresetSound.sweep);
      },
    });
    menuArray.push(ContextMenuSeparator);
    menuArray.push({
      name: 'オブジェクト作成',
      action: undefined,
      subActions: this.tabletopActionService.makeDefaultContextMenuActions(objectPosition),
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
    if (!this.gameTableMask!.isMine) return false;
    this.ngZone.run(() => {
      this.scratched();
      this.gameTableMask!.owner = '';
      this.scratchingGrids = '';
      this.isPreview = false;
    });
    this._scratchingGridX = -1;
    this._scratchingGridY = -1;
    SoundEffect.play(PresetSound.cardPut);
    //    this.chatMessageService.sendOperationLog(`${ this.gameTableMask!.name == '' ? '(無名のマップマスク)' : this.gameTableMask!.name } のスクラッチを終了した`);
    return false;
  }

  scratchCancel(e: Event | null = null) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!this.gameTableMask!.isMine && this.ownerIsOnline) return false;
    this.ngZone.run(() => {
      this.gameTableMask!.owner = '';
      this.scratchingGrids = '';
      this.isPreview = false;
    });
    this._scratchingGridX = -1;
    this._scratchingGridY = -1;
    SoundEffect.play(PresetSound.unlock);
    //    this.chatMessageService.sendOperationLog(`${ this.gameTableMask!.name == '' ? '(無名のマップマスク)' : this.gameTableMask!.name } のスクラッチを終了した`);
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
