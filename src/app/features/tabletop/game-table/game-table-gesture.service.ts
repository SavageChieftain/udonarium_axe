import { inject, Injectable } from '@angular/core';
import { ContextMenuService } from '@axe/application/ui/context-menu.service';
import { UiSignalService } from '@axe/application/ui/ui-signal.service';
import { PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { TableMouseGesture, TableMouseGestureEvent } from '@axe/features/tabletop/game-table/table-mouse-gesture';
import { TableTouchGesture, TableTouchGestureEvent } from '@axe/features/tabletop/game-table/table-touch-gesture';

@Injectable()
export class GameTableGestureService {
  private readonly contextMenuService = inject(ContextMenuService);
  private readonly pointerDeviceService = inject(PointerDeviceService);
  private readonly uiSignalService = inject(UiSignalService);

  isTableTransformMode = false;
  isTableTransformed = false;

  viewPositionX = 100;
  viewPositionY = 0;
  viewPositionZ = 0;
  viewRotateX = 50;
  viewRotateY = 0;
  viewRotateZ = 10;

  private mouseGesture: TableMouseGesture | null = null;
  private touchGesture: TableTouchGesture | null = null;

  private gameTableEl!: HTMLElement;
  private gameObjectsEl!: HTMLElement;
  private gridCanvasEl!: HTMLCanvasElement;
  private getGridShow!: () => boolean;

  initialize(
    rootEl: HTMLElement,
    gameTableEl: HTMLElement,
    gameObjectsEl: HTMLElement,
    gridCanvasEl: HTMLCanvasElement,
    getGridShow: () => boolean
  ): void {
    this.gameTableEl = gameTableEl;
    this.gameObjectsEl = gameObjectsEl;
    this.gridCanvasEl = gridCanvasEl;
    this.getGridShow = getGridShow;

    this.touchGesture = new TableTouchGesture(rootEl);
    this.touchGesture.onstart = () => this.onTableTouchStart();
    this.touchGesture.onend = () => this.onTableTouchEnd();
    this.touchGesture.ongesture = () => this.onTableTouchGesture();
    this.touchGesture.ontransform = (tX, tY, tZ, rX, rY, rZ, ev, src) =>
      this.onTableTouchTransform(tX, tY, tZ, rX, rY, rZ, ev, src);

    this.mouseGesture = new TableMouseGesture(rootEl);
    this.mouseGesture.onstart = (e) => this.onTableMouseStart(e);
    this.mouseGesture.onend = (e) => this.onTableMouseEnd(e);
    this.mouseGesture.ontransform = (tX, tY, tZ, rX, rY, rZ, ev, src) =>
      this.onTableMouseTransform(tX, tY, tZ, rX, rY, rZ, ev, src);
  }

  cancelInput(): void {
    if (!this.gridCanvasEl) return;
    this.mouseGesture?.cancel();
    this.isTableTransformMode = true;
    this.pointerDeviceService.isDragging = false;
    const opacity = this.getGridShow() ? 1.0 : 0.0;
    this.gridCanvasEl.style.opacity = opacity + '';
  }

  setTransform(tX: number, tY: number, tZ: number, rX: number, rY: number, rZ: number): void {
    this.viewRotateX += rX;
    this.viewRotateY += rY;
    this.viewRotateZ += rZ;
    this.viewPositionX += tX;
    this.viewPositionY += tY;
    this.viewPositionZ += tZ;

    if (rX !== 0 || rY !== 0 || rZ !== 0) {
      this.uiSignalService.notifyTableViewRotation(this.viewRotateX, this.viewRotateY, this.viewRotateZ);
    }

    const tx = this.viewPositionX.toFixed(4);
    const ty = this.viewPositionY.toFixed(4);
    const tz = this.viewPositionZ.toFixed(4);
    const rx = this.viewRotateX.toFixed(4);
    const ry = this.viewRotateY.toFixed(4);
    const rz = this.viewRotateZ.toFixed(4);
    this.gameTableEl.style.transform = `translateZ(${tz}px) translateY(${ty}px) translateX(${tx}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`;
  }

  private onTableTouchStart(): void {
    this.mouseGesture?.cancel();
  }

  private onTableTouchEnd(): void {
    this.cancelInput();
  }

  private onTableTouchGesture(): void {
    this.cancelInput();
  }

  private onTableTouchTransform(
    transformX: number,
    transformY: number,
    transformZ: number,
    rotateX: number,
    rotateY: number,
    rotateZ: number,
    _event: TableTouchGestureEvent,
    srcEvent: TouchEvent | MouseEvent | PointerEvent
  ): void {
    if (!this.isTableTransformMode || document.body !== document.activeElement) return;

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu && this.contextMenuService.isShow) {
      this.contextMenuService.close();
    }

    if (srcEvent.cancelable) srcEvent.preventDefault();

    const scale = (3000 + Math.abs(this.viewPositionZ)) / 3000;
    transformX *= scale;
    transformY *= scale;
    transformZ *= 3;
    if (80 < rotateX + this.viewRotateX) rotateX += 80 - (rotateX + this.viewRotateX);
    if (rotateX + this.viewRotateX < 0) rotateX += 0 - (rotateX + this.viewRotateX);

    const maxZ = 0;
    if (maxZ < transformZ + this.viewPositionZ) transformZ += maxZ - (transformZ + this.viewPositionZ);

    const minZ = -6000;
    if (transformZ + this.viewPositionZ < minZ) transformZ += minZ - (transformZ + this.viewPositionZ);

    this.setTransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ);
    this.isTableTransformed = true;
  }

  private onTableMouseStart(e: TouchEvent | MouseEvent | PointerEvent): void {
    const me = e as MouseEvent;
    const target = me.target as HTMLElement;
    if (
      target.contains(this.gameObjectsEl) ||
      me.button === 1 ||
      me.button === 2 ||
      target.closest('[data-table-passthrough]') != null
    ) {
      this.isTableTransformMode = true;
    } else {
      this.isTableTransformMode = false;
      this.pointerDeviceService.isDragging = true;
      this.gridCanvasEl.style.opacity = 1.0 + '';
      this.uiSignalService.notifyTerrainGridShow();
    }
    if (!document.activeElement?.contains(me.target as Node)) {
      this.removeSelectionRanges();
      this.removeFocus();
    }
  }

  private onTableMouseEnd(_e: TouchEvent | MouseEvent | PointerEvent): void {
    this.cancelInput();
    this.uiSignalService.notifyTerrainGridEnd();
  }

  private onTableMouseTransform(
    transformX: number,
    transformY: number,
    transformZ: number,
    rotateX: number,
    rotateY: number,
    rotateZ: number,
    _event: TableMouseGestureEvent,
    srcEvent: TouchEvent | MouseEvent | PointerEvent | KeyboardEvent
  ): void {
    if (!this.isTableTransformMode || document.body !== document.activeElement) return;

    if (!this.pointerDeviceService.isAllowedToOpenContextMenu && this.contextMenuService.isShow) {
      this.contextMenuService.close();
    }

    if ((srcEvent as Event).cancelable) (srcEvent as Event).preventDefault();

    const scale = (3000 + Math.abs(this.viewPositionZ)) / 3000;
    transformX *= scale;
    transformY *= scale;
    transformZ *= 3;

    this.setTransform(transformX, transformY, transformZ, rotateX, rotateY, rotateZ);
    this.isTableTransformed = true;
  }

  private removeSelectionRanges(): void {
    const selection = window.getSelection();
    if (!selection?.isCollapsed) {
      selection?.removeAllRanges();
    }
  }

  private removeFocus(): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }
}
