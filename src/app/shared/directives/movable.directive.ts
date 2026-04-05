import { afterNextRender, DestroyRef, Directive, effect, ElementRef, inject, input, output } from '@angular/core';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerCoordinate, PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { GridType } from '@axe/domain/tabletop/game-table';
import { isHexGrid } from '@axe/domain/tabletop/hex-geometry';
import { TableSelecter } from '@axe/domain/tabletop/table-selecter';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { InputHandler } from '@axe/shared/directives/input-handler';
import {
  applyPointerEvents,
  calcHexSnapPosition,
  calcSnapNum,
  collectCollidableElements,
  registerLayer,
  setLayerCollidable,
  shouldTransitionTo,
  toTransformCss,
  unregisterLayer,
} from '@axe/shared/directives/movable-helpers';
import {
  handleContextMenu,
  handleInputEnd,
  handleInputMove,
  handleInputStart,
  MovableInteractionContext,
} from '@axe/shared/directives/movable-interaction';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { BatchService } from '@axe/shared/ui/batch.service';
import { SelectionSignalService } from '@axe/shared/ui/selection-signal.service';

export interface MovableOption {
  readonly tabletopObject?: TabletopObject;
  readonly layerName?: string;
  readonly colideLayers?: string[];
  readonly transformCssOffset?: string;
}

@Directive({ selector: '[appMovable]' })
export class MovableDirective {
  private readonly elementRef = inject(ElementRef);
  private readonly batchService = inject(BatchService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly coordinateService = inject(CoordinateService);
  private readonly tableSelecter = inject(TableSelecter);
  private readonly selectionSignalService = inject(SelectionSignalService);
  private readonly objectChange = inject(ObjectChangeService);
  private readonly destroyRef = inject(DestroyRef);

  private static layerHash: { [layerName: string]: MovableDirective[] } = {};

  private tabletopObject!: TabletopObject;
  private layerName: string = '';
  private colideLayers: string[] = [];
  private transformCssOffset: string = '';

  readonly option = input.required<MovableOption>({ alias: 'movable.option' });
  readonly isDisable = input(false, { alias: 'movable.disable' });
  readonly isScratcOwner = input(false, { alias: 'movable.scratch_owner' });

  readonly onstart = output<PointerEvent>({ alias: 'movable.onstart' });
  readonly ondragstart = output<PointerEvent>({ alias: 'movable.ondragstart' });
  readonly ondrag = output<PointerEvent>({ alias: 'movable.ondrag' });
  readonly ondragend = output<PointerEvent>({ alias: 'movable.ondragend' });
  readonly onend = output<PointerEvent>({ alias: 'movable.onend' });

  private get nativeElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  private _posX: number = 0;
  private _posY: number = 0;
  private _posZ: number = 0;

  private mathFloor: boolean = true;

  get posX(): number {
    return this._posX;
  }
  set posX(posX: number) {
    this._posX = this.mathFloor ? Math.floor(posX) : posX;
    this.setUpdateTimer();
  }
  get posY(): number {
    return this._posY;
  }
  set posY(posY: number) {
    this._posY = this.mathFloor ? Math.floor(posY) : posY;
    this.setUpdateTimer();
  }
  get posZ(): number {
    return this._posZ;
  }
  set posZ(posZ: number) {
    this._posZ = this.mathFloor ? Math.floor(posZ * 8) / 8 : posZ;
    this.setUpdateTimer();
  }

  pointerOffset2d: PointerCoordinate = { x: 0, y: 0, z: 0 };
  pointerStart3d: PointerCoordinate = { x: 0, y: 0, z: 0 };

  targetStartRect!: DOMRect;

  height: number = 0;
  width: number = 0;
  ratio: number = 1.0;

  private updateTimer: NodeJS.Timeout | null = null;
  private collidableElements: HTMLElement[] = [];
  input: InputHandler | null = null;

  get isGridSnap(): boolean {
    return this.tableSelecter.viewTable?.gridSnap ?? true;
  }

  constructor() {
    effect(() => {
      const opt = this.option();
      if (opt.tabletopObject != null) this.tabletopObject = opt.tabletopObject;
      if (opt.layerName != null) this.layerName = opt.layerName;
      if (opt.colideLayers != null) this.colideLayers = opt.colideLayers;
      if (opt.transformCssOffset != null) this.transformCssOffset = opt.transformCssOffset;
    });
    afterNextRender(() => {
      this.batchService.add(() => this.initialize(), this.elementRef);
      this.setPosition(this.tabletopObject);
    });
    this.destroyRef.onDestroy(() => {
      this.cancel();
      if (this.input) this.input.destroy();
      this.unregister();
      this.batchService.remove(this);
      this.batchService.remove(this.elementRef);
    });
  }

  initialize() {
    this.input = new InputHandler(this.nativeElement);
    this.input.onStart = (e) => this.onInputStart(e);
    this.input.onMove = (e) => this.onInputMove(e);
    this.input.onEnd = (e) => this.onInputEnd(e);
    this.input.onContextMenu = (e) => this.onContextMenu(e);

    this.objectChange.objectChanged$.subscribe((event) => {
      if (
        !this.tabletopObject ||
        (event.isSendFromSelf && this.input!.isGrabbing) ||
        event.identifier !== this.tabletopObject.identifier ||
        !this.shouldTransition(this.tabletopObject)
      )
        return;
      this.batchService.add(() => {
        if (this.input!.isGrabbing) {
          this.cancel();
        } else {
          this.setAnimatedTransition(true);
        }
        this.stopTransition();
        this.setPosition(this.tabletopObject);
      }, this);
    }, this.destroyRef);

    if (this.layerName.length < 1 && this.tabletopObject) this.layerName = this.tabletopObject.aliasName;
    this.register();
    this.setPosition(this.tabletopObject);
  }

  cancel() {
    if (this.input) this.input.cancel();
    this.setPointerEvents(true);
    this.setAnimatedTransition(true);
    this.setCollidableLayer(false);
  }

  cancelTableGesture() {
    this.selectionSignalService.cancelTableGesture();
  }

  scratchObjectPosition(_start: boolean) {
    const pointerScratch2d = {
      x: this.input!.pointer.x,
      y: this.input!.pointer.y,
      z: 0,
    };
    pointerScratch2d.x = Math.min(window.innerWidth - 0.1, Math.max(pointerScratch2d.x, 0.1));
    pointerScratch2d.y = Math.min(window.innerHeight - 0.1, Math.max(pointerScratch2d.y, 0.1));

    const elementScratch = document.elementFromPoint(pointerScratch2d.x, pointerScratch2d.y) as HTMLElement;
    if (elementScratch == null) return;

    const pointerSchratch3d = this.coordinateService.calcTabletopLocalCoordinate(pointerScratch2d, elementScratch);

    pointerSchratch3d.x -= this.posX;
    pointerSchratch3d.y -= this.posY;
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.callSelectedEvent();
    if (this.collidableElements.length < 1) this.findCollidableElements(); // 稀にcollidableElementsの取得に失敗している

    handleInputStart(this as unknown as MovableInteractionContext, e);
  }

  onInputMove(e: MouseEvent | TouchEvent) {
    handleInputMove(this as unknown as MovableInteractionContext, e);
  }

  onInputEnd(e: MouseEvent | TouchEvent) {
    handleInputEnd(this as unknown as MovableInteractionContext, e);
  }

  onContextMenu(e: MouseEvent | TouchEvent) {
    handleContextMenu(this as unknown as MovableInteractionContext, e);
  }

  private callSelectedEvent() {
    if (this.tabletopObject)
      this.selectionSignalService.selectObject(this.tabletopObject.identifier, this.tabletopObject.aliasName);
  }

  snapToGrid(gridSize: number = 25) {
    const table = this.tableSelecter.viewTable;
    const effectiveGridSize = table?.gridSize ?? gridSize;
    const gridType = table?.gridType ?? GridType.SQUARE;

    if (isHexGrid(gridType)) {
      const center = { x: this.posX + this.width / 2, y: this.posY + this.height / 2 };
      const snapped = calcHexSnapPosition(
        center.x,
        center.y,
        effectiveGridSize,
        gridType,
        this.width / 2,
        this.height / 2
      );
      this.posX = snapped.x;
      this.posY = snapped.y;
    } else {
      this.posX = calcSnapNum(this.posX, effectiveGridSize);
      this.posY = calcSnapNum(this.posY, effectiveGridSize);
    }
  }

  private setPosition(object: TabletopObject) {
    if (!object?.location) return;
    this._posX = this.mathFloor ? Math.floor(object.location.x) : object.location.x;
    this._posY = this.mathFloor ? Math.floor(object.location.y) : object.location.y;
    this._posZ = this.mathFloor ? Math.floor(object.posZ * 8) / 8 : object.posZ;

    this.updateTransformCss();
  }

  private setUpdateTimer() {
    if (this.updateTimer === null && this.tabletopObject) {
      this.updateTimer = setTimeout(() => {
        this.tabletopObject.location.x = this.posX;
        this.tabletopObject.location.y = this.posY;
        this.tabletopObject.posZ = this.posZ;
        this.updateTimer = null;
      }, 66);
    }
    this.updateTransformCss();
  }

  private findCollidableElements() {
    this.collidableElements = collectCollidableElements(this.nativeElement);
  }

  setPointerEvents(isEnable: boolean) {
    applyPointerEvents(this.collidableElements, isEnable);
  }

  setAnimatedTransition(isEnable: boolean) {
    this.nativeElement.style.transition = isEnable ? 'transform 132ms linear' : '';
  }

  private shouldTransition(object: TabletopObject): boolean {
    return shouldTransitionTo(object, this.posX, this.posY, this.posZ);
  }

  private stopTransition() {
    this.nativeElement.style.transform = window.getComputedStyle(this.nativeElement).transform;
  }

  private updateTransformCss() {
    this.nativeElement.style.transform = toTransformCss(this.posX, this.posY, this.posZ, this.transformCssOffset);
  }

  setCollidableLayer(isCollidable: boolean) {
    setLayerCollidable(MovableDirective.layerHash, this.colideLayers, this, !!this.input?.isGrabbing, isCollidable);
  }

  private register() {
    registerLayer(MovableDirective.layerHash, this.layerName, this);
  }

  private unregister() {
    unregisterLayer(MovableDirective.layerHash, this.layerName, this);
  }
}
