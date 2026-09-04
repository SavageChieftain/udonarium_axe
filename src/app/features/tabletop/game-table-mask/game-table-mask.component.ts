import { NgStyle } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { TRANSLATE_FN } from '@axe/application/i18n/translate.token';
import { CoordinateService } from '@axe/application/input/coordinate.service';
import { PointerDeviceService } from '@axe/application/input/pointer-device.service';
import { GameObjectInventoryService } from '@axe/application/inventory/game-object-inventory.service';
import { ObjectChangeService } from '@axe/application/sync/object-change.service';
import { TabletopService } from '@axe/application/tabletop/tabletop.service';
import { TabletopActionService } from '@axe/application/tabletop/tabletop-action.service';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { ModalService } from '@axe/application/ui/modal.service';
import { PieceContextMenuService } from '@axe/application/ui/piece-context-menu.service';
import { sheetPanelTitle } from '@axe/application/ui/sheet-panel';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { getPeerContext } from '@axe/core/network/peer-context-source';
import { imageFileEqual } from '@axe/core/storage/image-file';
import { PresetSound, SoundEffect } from '@axe/domain/media/sound-effect';
import { GridType } from '@axe/domain/tabletop/game-table';
import { GameTableMask } from '@axe/domain/tabletop/game-table-mask';
import { hexCircumradius, isFlatTopGrid, isHexGrid, pixelToHexCell } from '@axe/domain/tabletop/hex-geometry';
import { computeHexMaskGeometry } from '@axe/domain/tabletop/hex-mask-geometry';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { ObjectPanelService } from '@axe/features/panels/object-panel.service';
import { buildGameTableMaskContextMenu } from '@axe/features/tabletop/game-table-mask/game-table-mask-context-menu';
import {
  buildHexOuterBorderSvg,
  buildHexOutlineMask,
  buildMaskCss,
  buildScratchingGridInfos,
  type ScratchGridInfo,
} from '@axe/features/tabletop/game-table-mask/game-table-mask-helpers';
import { MovableOption } from '@axe/ui/directives/movable.directive';
import { MovableDirective } from '@axe/ui/directives/movable.directive';
import { SelectableDirective } from '@axe/ui/directives/selectable.directive';
import { SafePipe } from '@axe/ui/pipes/safe.pipe';
import { setupInputHandler, setupMovableForPiece } from '@axe/ui/tabletop/setup-tabletop-piece';
import { translateZCss, Z_OFFSET_MASK_PX } from '@axe/ui/tabletop/z-offset';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'game-table-mask',
  templateUrl: './game-table-mask.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MovableDirective, SelectableDirective, NgStyle, SafePipe, TranslocoModule],
  host: {
    class: 'block',
    '(dragstart)': 'onDragstart($event)',
    '(pointerdown)': 'onInputStartPointer($event)',
    '(pointermove)': 'onInputMovePointer($event)',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class GameTableMaskComponent {
  private static readonly GRID_PATTERN = /^\d+:\d+$/;
  private readonly tabletopActionService = inject(TabletopActionService);
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pieceContextMenu = inject(PieceContextMenuService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly objectPanels = inject(ObjectPanelService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly modalService = inject(ModalService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly inventoryService = inject(GameObjectInventoryService);
  private readonly uiSignalService = inject(UiSignalService);
  private readonly tabletopService = inject(TabletopService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translateFn = inject(TRANSLATE_FN);

  constructor() {
    setupMovableForPiece(this, {
      target: this.gameTableMask,
      collideLayers: ['terrain'],
      transformCssOffset: translateZCss(Z_OFFSET_MASK_PX),
      snapOrigin: () => {
        const geo = computeHexMaskGeometry(this.width, this.height, this.gridSize, this.gridType());
        return geo ? { x: geo.offsetX, y: geo.offsetY } : undefined;
      },
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this._scratchingTimerId);
    });
  }

  private readonly inputRef = setupInputHandler({
    elementRef: this.elementRef,
    destroyRef: this.destroyRef,
    onStart: (e) => this.onInputStart(e),
    onMove: (e) => this.onInputMove(e),
  });

  private get input() {
    return this.inputRef.current;
  }

  readonly gameTableMask = input<GameTableMask | null>(null);

  get dispLockMark(): boolean {
    const mask = this.gameTableMask();
    return mask?.dispLockMark ?? false;
  }
  set dispLockMark(disp: boolean) {
    const mask = this.gameTableMask();
    if (mask) mask.dispLockMark = disp;
  }

  readonly name = computed(() => {
    const mask = this.gameTableMask();
    if (!mask) return '';
    this.objectChange.versionOf(mask.identifier)();
    return mask.name;
  });

  protected readonly maskVersion = computed<number>(() => {
    const mask = this.gameTableMask();
    if (!mask) return 0;
    return this.objectChange.versionOf(mask.identifier)();
  });

  get width(): number {
    const mask = this.gameTableMask();
    return Math.max(0, mask?.width ?? 0);
  }
  get height(): number {
    const mask = this.gameTableMask();
    return Math.max(0, mask?.height ?? 0);
  }
  get opacity(): number {
    const mask = this.gameTableMask();
    return mask?.opacity ?? 0;
  }
  readonly imageFile = computed(
    () => {
      const mask = this.gameTableMask();
      this.objectChange.fileVersion();
      if (!mask) throw new Error('gameTableMask is not set');
      this.objectChange.versionOf(mask.identifier)();
      return mask.imageFile;
    },
    { equal: imageFileEqual() }
  );
  get isLock(): boolean {
    const mask = this.gameTableMask();
    return mask?.isLock ?? false;
  }
  set isLock(isLock: boolean) {
    const mask = this.gameTableMask();
    if (mask) mask.isLock = isLock;
  }

  get blendType(): number {
    return 0;
  }

  get color(): string {
    const mask = this.gameTableMask();
    return mask?.color ?? '';
  }
  set color(color: string) {
    const mask = this.gameTableMask();
    if (mask) mask.color = color;
  }
  get bgcolor(): string {
    const mask = this.gameTableMask();
    return mask?.bgcolor ?? '';
  }
  set bgcolor(bgcolor: string) {
    const mask = this.gameTableMask();
    if (mask) mask.bgcolor = bgcolor;
  }

  get isPreview(): boolean {
    const mask = this.gameTableMask();
    return mask?.isPreview ?? false;
  }
  set isPreview(isPreview: boolean) {
    const mask = this.gameTableMask();
    if (mask) mask.isPreview = isPreview;
  }
  get isPreviewMode(): boolean {
    const mask = this.gameTableMask();
    if (!mask) return false;
    return mask.isPreview && mask.isMine;
  }

  get gameTableMaskAltitude(): number {
    return +this.altitude.toFixed(1);
  }

  get scratchedGrids() {
    const mask = this.gameTableMask();
    return mask?.scratchedGrids ?? '';
  }
  set scratchedGrids(scratchedGrids: string) {
    const mask = this.gameTableMask();
    if (mask) mask.scratchedGrids = scratchedGrids;
  }

  get scratchingGrids() {
    const mask = this.gameTableMask();
    return mask?.scratchingGrids ?? '';
  }
  set scratchingGrids(scratchingGrids: string) {
    const mask = this.gameTableMask();
    if (mask) mask.scratchingGrids = scratchingGrids;
  }

  get isNonScratched(): boolean {
    const mask = this.gameTableMask();
    return !mask?.scratchedGrids;
  }

  get isNonScratching(): boolean {
    const mask = this.gameTableMask();
    return !(mask?.scratchingGrids || this._currentScratchingSet);
  }

  get masksCss(): string {
    return buildMaskCss({
      currentScratchingSet: this._currentScratchingSet,
      gridSize: this.gridSize,
      gridType: this.gridType(),
      height: this.height,
      isNonScratched: this.isNonScratched,
      isPreviewMode: this.isPreviewMode,
      scratchedGrids: this.scratchedGrids,
      scratchingGrids: this.scratchingGrids,
      width: this.width,
    });
  }

  get scratchingGridInfos(): ScratchGridInfo[] {
    return buildScratchingGridInfos({
      currentScratchingSet: this._currentScratchingSet,
      gridSize: this.gridSize,
      gridType: this.gridType(),
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
    const mask = this.gameTableMask();
    const ret = (mask?.opacity ?? 0) * (mask?.isMine ? 0.6 : 1);
    return ret < 0.4 && this.isScratching ? 0.4 : ret;
  }

  get altitude(): number {
    const mask = this.gameTableMask();
    return mask?.altitude ?? 0;
  }
  set altitude(altitude: number) {
    const mask = this.gameTableMask();
    if (mask) mask.altitude = altitude;
  }

  get isAltitudeIndicate(): boolean {
    const mask = this.gameTableMask();
    return mask?.isAltitudeIndicate ?? false;
  }
  set isAltitudeIndicate(isAltitudeIndicate: boolean) {
    const mask = this.gameTableMask();
    if (mask) mask.isAltitudeIndicate = isAltitudeIndicate;
  }

  get isInverse(): boolean {
    return Math.abs(this.viewRotateZ()) % 360 > 90 && Math.abs(this.viewRotateZ()) % 360 < 270;
  }
  get isScratching(): boolean {
    const mask = this.gameTableMask();
    return !!mask?.owner;
  }

  get hasOwner(): boolean {
    const mask = this.gameTableMask();
    return mask?.hasOwner ?? false;
  }
  get ownerIsOnline(): boolean {
    const mask = this.gameTableMask();
    return mask?.ownerIsOnline ?? false;
  }
  get ownerName(): string {
    const mask = this.gameTableMask();
    return mask?.ownerName ?? '';
  }
  get ownerColor(): string {
    const mask = this.gameTableMask();
    return mask?.ownerColor ?? '';
  }

  get gridSize(): number {
    return this.tabletopService.gridSize();
  }
  math = Math;
  readonly viewRotateZ = this.uiSignalService.tableViewRotationZ;

  readonly gridType = computed(() => {
    const table = this.tableSelecter.viewTable;
    if (!table) return GridType.SQUARE;
    this.objectChange.versionOf(table.identifier)();
    return table.gridType;
  });

  get hexMarkerR(): number {
    return hexCircumradius(this.gridSize) * 0.5;
  }

  get hexOutlineMask(): string {
    return buildHexOutlineMask(this.gridSize, this.gridType(), this.width, this.height);
  }

  get hexOuterBorder(): string {
    return buildHexOuterBorderSvg(this.gridSize, this.gridType(), this.width, this.height);
  }

  get pixelWidth(): number {
    return (
      computeHexMaskGeometry(this.width, this.height, this.gridSize, this.gridType())?.pixelW ??
      this.width * this.gridSize
    );
  }

  get pixelHeight(): number {
    return (
      computeHexMaskGeometry(this.width, this.height, this.gridSize, this.gridType())?.pixelH ??
      this.height * this.gridSize
    );
  }

  readonly movableOption = signal<MovableOption>({});

  private buildScratchingGrids(set: Set<string>): string {
    const grids: string[] = [];
    for (const g of set) {
      if (g && GameTableMaskComponent.GRID_PATTERN.test(g)) grids.push(g);
    }
    return grids.sort().join(',');
  }

  onDragstart(e: Event) {
    e.stopPropagation();
    e.preventDefault();
  }

  onMaskMouseDown(e: MouseEvent) {
    if (this.isLock && !this.isScratching) {
      e.stopPropagation();
    }
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    const mask = this.gameTableMask();
    if (!mask) return;

    if (!this.isScratching || !mask.isMine) {
      if (this.input) this.input.cancel();
    } else if (!window.PointerEvent && (e as MouseEvent).button < 2 && (e as MouseEvent).buttons < 2) {
      this.scratching(true);
    }
  }

  onInputStartPointer(e: PointerEvent) {
    const mask = this.gameTableMask();
    if (!mask) return;

    if (this.isScratching && mask.isMine && e.button < 2 && e.buttons < 2) {
      this.scratching(true, { offsetX: e.offsetX, offsetY: e.offsetY });
    }
  }

  private _scratchingGridX = -1;
  private _scratchingGridY = -1;
  onInputMove(_e: MouseEvent | TouchEvent) {
    const mask = this.gameTableMask();
    if (!window.PointerEvent && mask && this.isScratching && mask.isMine && this.input?.isDragging) {
      this.scratching(false);
    }
  }

  onInputMovePointer(e: PointerEvent) {
    const mask = this.gameTableMask();
    if (mask && this.isScratching && mask.isMine && this.input?.isDragging && e.buttons < 2) {
      this.scratching(false, { offsetX: e.offsetX, offsetY: e.offsetY });
    }
    e.stopPropagation();
    e.preventDefault();
  }

  private _currentScratchingSet: Set<string> | null = null;
  private _scratchingTimerId: ReturnType<typeof setTimeout> | undefined;
  scratching(isStart: boolean, position: { offsetX: number; offsetY: number } | null = null) {
    const mask = this.gameTableMask();
    if (!mask || !mask.isMine) return;
    const tableSelecter = this.tableSelecter;

    if (!tableSelecter.viewTable?.gridShow) {
      const viewTable = tableSelecter.viewTable;
      if (viewTable)
        viewTable.gridClipRect = {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        };
    }
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
      offsetX = scratchingPosition.x - mask.location.x;
      offsetY = scratchingPosition.y - mask.location.y;
    }
    if (offsetX < 0 || this.pixelWidth <= offsetX || offsetY < 0 || this.pixelHeight <= offsetY) return;

    let gridX: number;
    let gridY: number;
    const gridType = this.gridType();
    if (isHexGrid(gridType)) {
      const isFlatTop = isFlatTopGrid(gridType);
      const geo = computeHexMaskGeometry(this.width, this.height, this.gridSize, gridType);
      if (!geo) return;
      const { col, row } = pixelToHexCell(offsetX - geo.offsetX, offsetY - geo.offsetY, this.gridSize, isFlatTop);
      if (col < 0 || col >= this.width || row < 0 || row >= this.height) return;
      gridX = col;
      gridY = row;
    } else {
      gridX = Math.floor(offsetX / this.gridSize);
      gridY = Math.floor(offsetY / this.gridSize);
    }

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
      if (this._currentScratchingSet) {
        this.scratchingGrids = this.buildScratchingGrids(this._currentScratchingSet);
      }
      this._currentScratchingSet = null;
    }, 250);
  }

  scratched() {
    const mask = this.gameTableMask();
    if (!mask) return;

    const currentScratchedAry: string[] = this.scratchedGrids ? this.scratchedGrids.split(/,/g) : [];
    if (this._currentScratchingSet) {
      clearTimeout(this._scratchingTimerId);
      this.scratchingGrids = this.buildScratchingGrids(this._currentScratchingSet);
      this._currentScratchingSet = null;
    }
    const currentScratchingAry: string[] = this.scratchingGrids.split(/,/g);
    const aSet = new Set(currentScratchedAry);
    const bSet = new Set(currentScratchingAry);
    this.scratchedGrids = [
      ...currentScratchedAry.filter((x) => !bSet.has(x)),
      ...currentScratchingAry.filter((x) => !aSet.has(x)),
    ]
      .filter((grid) => grid && GameTableMaskComponent.GRID_PATTERN.test(grid))
      .sort()
      .join(',');
  }

  onContextMenu(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    const mask = this.gameTableMask();
    if (!mask) return;

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu) return;
    const menuPosition = this.pointerDeviceService.pointers[0];
    if (this.pieceContextMenu.openForSelection(mask, this.gridSize, menuPosition)) return;
    const objectPosition = this.coordinateService.calcTabletopLocalCoordinate();
    const menuArray = buildGameTableMaskContextMenu({
      mask: mask,
      gridSize: this.gridSize,
      objectPosition,
      inventoryService: this.inventoryService,
      tabletopActionService: this.tabletopActionService,
      onStartScratch: () => {
        if (mask.owner != '') {
          this.isPreview = false;
          clearTimeout(this._scratchingTimerId);
          this._currentScratchingSet = null;
        }
        mask.owner = getPeerContext().userId;
        this._scratchingGridX = -1;
        this._scratchingGridY = -1;
      },
      onFinishScratch: () => {
        this.scratchDone();
        this.isPreview = false;
        mask.owner = '';
      },
      onCancelScratch: () => {
        mask.owner = '';
      },
      onEdit: (m) => this.showDetail(m),
      t: this.translateFn,
    });
    this.contextMenuService.open(menuPosition, menuArray, this.name());
  }

  onMove() {
    SoundEffect.play(PresetSound.cardPick);
  }

  onMoved() {
    SoundEffect.play(PresetSound.cardPut);
  }

  onScratchDonePointerDown(e: PointerEvent) {
    if (e.button !== 0) return false;
    return this.scratchDone(e);
  }

  onScratchCancelPointerDown(e: PointerEvent) {
    if (e.button !== 0) return false;
    return this.scratchCancel(e);
  }

  scratchDone(e: Event | null = null) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const mask = this.gameTableMask();
    if (!mask || !mask.isMine) return false;
    this.scratched();
    mask.owner = '';
    this.scratchingGrids = '';
    this.isPreview = false;
    this._scratchingGridX = -1;
    this._scratchingGridY = -1;
    SoundEffect.play(PresetSound.cardPut);
    return false;
  }

  scratchCancel(e: Event | null = null) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const mask = this.gameTableMask();
    if (mask && !mask.isMine && this.ownerIsOnline) return false;
    if (mask) mask.owner = '';
    this.scratchingGrids = '';
    this.isPreview = false;
    this._scratchingGridX = -1;
    this._scratchingGridY = -1;
    SoundEffect.play(PresetSound.unlock);
    return false;
  }

  private showDetail(gameObject: GameTableMask) {
    const title = sheetPanelTitle(this.translateFn('feature.tabletop.panel.mask'), gameObject.name);
    this.objectPanels.openSheet(gameObject, title, { width: 400, height: 300 });
  }

  identify(index: number, item: { identifier?: string } | null): string | number {
    return item?.identifier ?? index;
  }
}
