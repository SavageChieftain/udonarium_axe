import {
  AfterViewInit,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CoordinateService } from '@axe/core/input/coordinate.service';
import { PointerCoordinate, PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { RangeArea } from '@axe/domain/tabletop/range';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';
import { InputHandler } from '@axe/shared/directives/input-handler';
import { ObjectChangeService } from '@axe/shared/sync/object-change.service';
import { BatchService } from '@axe/shared/ui/batch.service';

export interface RotableTabletopObject extends TabletopObject {
  rotate: number;
}

export interface RotableOption {
  readonly tabletopObject?: RotableTabletopObject;
  readonly grabbingSelecter?: string;
  readonly transformCssOffset?: string;
}

@Directive({ selector: '[appRotable]' })
export class RotableDirective implements AfterViewInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private batchService = inject(BatchService);
  private pointerDeviceService = inject(PointerDeviceService);
  private coordinateService = inject(CoordinateService);
  private objectChange = inject(ObjectChangeService);
  private destroyRef = inject(DestroyRef);

  protected tabletopObject: RotableTabletopObject | null = null;

  private transformCssOffset: string = '';
  private grabbingSelecter: string = '.rotate-grab';
  readonly option = input<RotableOption | undefined>(undefined, { alias: 'rotable.option' });
  readonly isDisable = input(false, { alias: 'rotable.disable' });
  readonly onstart = output<PointerEvent>({ alias: 'rotable.onstart' });
  readonly ondragstart = output<PointerEvent>({ alias: 'rotable.ondragstart' });
  readonly ondrag = output<PointerEvent>({ alias: 'rotable.ondrag' });
  readonly ondragend = output<PointerEvent>({ alias: 'rotable.ondragend' });
  readonly onend = output<PointerEvent>({ alias: 'rotable.onend' });

  private get nativeElement(): HTMLElement {
    return this.elementRef.nativeElement;
  }

  private _rotate: number = 0;
  get rotate(): number {
    return this._rotate;
  }
  set rotate(rotate: number) {
    this._rotate = rotate;
    this.setUpdateTimer();
  }
  readonly value = input(0, { alias: 'rotable.value' });
  readonly valueChange = output<number>({ alias: 'rotable.valueChange' });

  private get isAllowedToRotate(): boolean {
    if (!this.grabbingElement || !this.nativeElement) return false;
    if (this.grabbingSelecter.length < 1) return true;
    const elements = this.nativeElement.querySelectorAll(this.grabbingSelecter);
    let macth: boolean;
    for (let i = 0; i < elements.length; i++) {
      macth = elements[i].contains(this.grabbingElement);
      if (macth) return true;
    }
    return false;
  }

  private rotateOffset: number = 0;
  private updateTimer: ReturnType<typeof setTimeout> | null = null;
  private grabbingElement: HTMLElement | null = null;
  private input: InputHandler | null = null;

  constructor() {
    effect(() => {
      const opt = this.option();
      if (opt == null) return;
      if (opt.tabletopObject != null) this.tabletopObject = opt.tabletopObject;
      if (opt.grabbingSelecter != null) this.grabbingSelecter = opt.grabbingSelecter;
      if (opt.transformCssOffset != null) this.transformCssOffset = opt.transformCssOffset;
    });
    effect(() => {
      this._rotate = this.value();
      this.updateTransformCss();
    });
  }

  ngAfterViewInit() {
    const opt = this.option();
    if (opt != null) {
      if (opt.tabletopObject != null) this.tabletopObject = opt.tabletopObject;
      if (opt.grabbingSelecter != null) this.grabbingSelecter = opt.grabbingSelecter;
      if (opt.transformCssOffset != null) this.transformCssOffset = opt.transformCssOffset;
    }
    this._rotate = this.value();
    this.batchService.add(() => this.initialize(), this.elementRef);
    if (this.tabletopObject) {
      this.setRotate(this.tabletopObject);
    } else {
      this.updateTransformCss();
    }
  }

  ngOnDestroy() {
    this.cancel();
    this.input?.destroy();
    this.batchService.remove(this);
    this.batchService.remove(this.elementRef);
  }

  initialize() {
    this.input = new InputHandler(this.nativeElement);
    this.input.onStart = (e) => this.onInputStart(e);
    this.input.onMove = (e) => this.onInputMove(e);
    this.input.onEnd = (e) => this.onInputEnd(e);
    this.input.onContextMenu = (e) => this.onContextMenu(e);

    if (this.tabletopObject) {
      this.objectChange.objectChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        const tabletopObject = this.tabletopObject;
        if (
          !tabletopObject ||
          (event.isSendFromSelf && this.input?.isGrabbing) ||
          event.identifier !== tabletopObject.identifier ||
          !this.shouldTransition(tabletopObject)
        )
          return;
        this.batchService.add(() => {
          if (this.input?.isGrabbing) {
            this.cancel();
          } else {
            this.setAnimatedTransition(true);
          }
          this.stopTransition();
          this.setRotate(tabletopObject);
        }, this);
      });
      this.setRotate(this.tabletopObject);
    } else {
      this.updateTransformCss();
    }
  }

  cancel() {
    this.input?.cancel();
    this.grabbingElement = null;
    this.setAnimatedTransition(true);
  }

  onInputStart(e: MouseEvent | TouchEvent) {
    this.grabbingElement = e.target as HTMLElement;
    if (this.isDisable() || !this.isAllowedToRotate || (e as MouseEvent).button === 1 || (e as MouseEvent).button === 2)
      return this.cancel();
    const input = this.input;
    const grabbingElement = this.grabbingElement;
    const parentElement = this.nativeElement.parentElement;
    if (!input || !grabbingElement || !parentElement) return this.cancel();

    e.stopPropagation();
    this.onstart.emit(e as PointerEvent);

    const pointer = this.coordinateService.convertLocalToLocal(input.pointer, grabbingElement, parentElement);
    this.rotateOffset = this.calcRotate(pointer, this.rotate);
    this.setAnimatedTransition(false);
  }

  onInputMove(e: MouseEvent | TouchEvent) {
    if (this.input?.isGrabbing && !this.pointerDeviceService.isDragging) {
      return this.cancel(); // todo
    }
    if (this.isDisable() || !this.input?.isGrabbing) return this.cancel();

    const input = this.input;
    const grabbingElement = this.grabbingElement;
    const parentElement = this.nativeElement.parentElement;
    if (!input || !grabbingElement || !parentElement) return this.cancel();

    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    const pointer3d = this.coordinateService.convertLocalToLocal(input.pointer, grabbingElement, parentElement);
    const angle = this.calcRotate(pointer3d, this.rotateOffset);

    if (!this.input?.isDragging) this.ondragstart.emit(e as PointerEvent);
    this.ondrag.emit(e as PointerEvent);
    this.rotate = angle;
  }

  onInputEnd(e: MouseEvent | TouchEvent) {
    if (this.isDisable()) return this.cancel();
    e.stopPropagation();
    if (this.input?.isDragging) this.ondragend.emit(e as PointerEvent);
    this.cancel();
    this.snapToPolygonal();
    this.onend.emit(e as PointerEvent);
  }

  onContextMenu(e: MouseEvent | TouchEvent) {
    if (this.isDisable()) return this.cancel();
    if (e.cancelable) e.preventDefault();
    this.cancel();
    this.snapToPolygonal();
  }

  private calcRotate(pointer: PointerCoordinate, rotateOffset: number): number {
    const centerX = this.nativeElement.clientWidth / 2;
    const centerY = this.nativeElement.clientHeight / 2;
    const x = pointer.x - centerX;
    const y = pointer.y - centerY;
    const rad = Math.atan2(y, x);
    return ((rad * 180) / Math.PI - rotateOffset) % 360;
  }

  snapToPolygonal(polygonal: number = 24) {
    if (polygonal <= 1) return;
    if (this.tabletopObject instanceof RangeArea) {
      const range = <RangeArea>this.tabletopObject;
      if (range.subDivisionSnapPolygonal) polygonal = 240;
    }
    this.rotate = this.rotate < 0 ? this.rotate - 180 / polygonal : this.rotate + 180 / polygonal;
    this.rotate -= this.rotate % (360 / polygonal);
  }

  private setUpdateTimer() {
    if (this.updateTimer === null) {
      this.updateTimer = setTimeout(() => {
        this.valueChange.emit(this.rotate);
        if (this.tabletopObject) this.tabletopObject.rotate = this.rotate;
        this.updateTimer = null;
      }, 66);
    }
    this.updateTransformCss();
  }

  private setRotate(object: RotableTabletopObject) {
    if (object) this._rotate = object.rotate;
    this.updateTransformCss();
  }

  private setAnimatedTransition(isEnable: boolean) {
    this.nativeElement.style.transition = isEnable ? 'transform 132ms linear' : '';
  }

  private shouldTransition(object: RotableTabletopObject): boolean {
    return object.rotate !== this.rotate;
  }

  private stopTransition() {
    this.nativeElement.style.transform = window.getComputedStyle(this.nativeElement).transform;
  }

  private updateTransformCss() {
    const css = `${this.transformCssOffset} rotateZ(${this.rotate.toFixed(4)}deg)`;
    this.nativeElement.style.transform = css;
  }
}
