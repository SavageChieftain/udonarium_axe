import { inject, Injectable, NgZone } from '@angular/core';

export interface PointerCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface PointerData extends PointerCoordinate {
  identifier: number;
}

const MOUSE_IDENTIFIER = -9999;

@Injectable({
  providedIn: 'root',
})
export class PointerDeviceService {
  private ngZone = inject(NgZone);

  private callbackOnPointerDown = (e: MouseEvent | TouchEvent) => this.onPointerDown(e);
  private callbackOnPointerMove = (e: MouseEvent | TouchEvent) => this.onPointerMove(e);
  private callbackOnPointerUp = (e: MouseEvent | TouchEvent) => this.onPointerUp(e);
  private callbackOnContextMenu = (e: MouseEvent) => this.onContextMenu(e);

  private _isAllowedToOpenContextMenu: boolean = false;
  get isAllowedToOpenContextMenu(): boolean {
    return this._isAllowedToOpenContextMenu;
  }

  targetElement: HTMLElement;

  pointers: PointerData[] = [{ x: 0, y: 0, z: 0, identifier: -1 }];
  private startPostion: PointerData = this.pointers[0];
  private primaryPointer: PointerData = this.pointers[0];
  get pointer(): PointerCoordinate {
    return this.primaryPointer;
  }
  get pointerX(): number {
    return this.primaryPointer.x;
  }
  get pointerY(): number {
    return this.primaryPointer.y;
  }

  private _isDragging: boolean = false; // todo
  get isDragging(): boolean {
    return this._isDragging;
  }
  set isDragging(isDragging: boolean) {
    if (isDragging === this._isDragging) return;
    this.ngZone.run(() => (this._isDragging = isDragging));
  }

  initialize() {
    this.addEventListeners();
  }

  destroy() {
    this.removeEventListeners();
  }

  private onPointerDown(e: MouseEvent | TouchEvent) {
    this.onPointerMove(e);
    this._isAllowedToOpenContextMenu = true;
    this.startPostion = this.pointers[0];
  }

  private onPointerMove(e: MouseEvent): void;
  private onPointerMove(e: TouchEvent): void;
  private onPointerMove(e: MouseEvent | TouchEvent): void;
  private onPointerMove(e: MouseEvent | TouchEvent): void {
    if ((e as TouchEvent).touches) {
      this.onTouchMove(e as TouchEvent);
    } else {
      this.onMouseMove(e as MouseEvent);
    }
    this.targetElement = e.target as HTMLElement;
  }

  private onPointerUp(e: MouseEvent | TouchEvent) {
    this.onPointerMove(e);
  }

  private onMouseMove(e: MouseEvent) {
    const mosuePointer: PointerData = { x: e.pageX, y: e.pageY, z: 0, identifier: MOUSE_IDENTIFIER };
    if (this.isSyntheticEvent(mosuePointer)) return;
    if (this._isAllowedToOpenContextMenu) this.preventContextMenuIfNeeded(mosuePointer);
    this.pointers = [mosuePointer];
    this.primaryPointer = mosuePointer;
  }

  private onTouchMove(e: TouchEvent) {
    const length = e.touches.length;
    if (length < 1) return;
    this.pointers = [];
    for (let i = 0; i < length; i++) {
      const touch = e.touches[i];
      const touchPointer: PointerData = { x: touch.pageX, y: touch.pageY, z: 0, identifier: touch.identifier };
      if (this._isAllowedToOpenContextMenu) this.preventContextMenuIfNeeded(touchPointer);
      this.pointers.push(touchPointer);
    }
    this.primaryPointer = this.pointers[0];
  }

  private onContextMenu(e: MouseEvent | TouchEvent) {
    this._isAllowedToOpenContextMenu = true;
    this.onPointerUp(e);
  }

  private preventContextMenuIfNeeded(pointer: PointerCoordinate, threshold: number = 3) {
    const distance = (pointer.x - this.startPostion.x) ** 2 + (pointer.y - this.startPostion.y) ** 2;
    if (threshold ** 2 < distance) this._isAllowedToOpenContextMenu = false;
  }

  private isSyntheticEvent(mosuePointer: PointerData, threshold: number = 15): boolean {
    for (const pointer of this.pointers) {
      if (pointer.identifier === mosuePointer.identifier) continue;
      const distance = (mosuePointer.x - pointer.x) ** 2 + (mosuePointer.y - pointer.y) ** 2;
      if (distance < threshold ** 2) return true;
    }
    return false;
  }

  private addEventListeners() {
    this.ngZone.runOutsideAngular(() => {
      document.body.addEventListener('mousedown', this.callbackOnPointerDown, true);
      document.body.addEventListener('mousemove', this.callbackOnPointerMove, true);
      document.body.addEventListener('mouseup', this.callbackOnPointerUp, true);
      document.body.addEventListener('touchstart', this.callbackOnPointerDown, true);
      document.body.addEventListener('touchmove', this.callbackOnPointerMove, true);
      document.body.addEventListener('touchend', this.callbackOnPointerUp, true);
      document.body.addEventListener('touchcancel', this.callbackOnPointerUp, true);
      document.body.addEventListener('drop', this.callbackOnPointerUp, true);
      document.body.addEventListener('contextmenu', this.callbackOnContextMenu, true);
    });
  }

  private removeEventListeners() {
    document.body.removeEventListener('mousedown', this.callbackOnPointerDown, true);
    document.body.removeEventListener('mousemove', this.callbackOnPointerMove, true);
    document.body.removeEventListener('mouseup', this.callbackOnPointerUp, true);
    document.body.removeEventListener('touchstart', this.callbackOnPointerDown, true);
    document.body.removeEventListener('touchmove', this.callbackOnPointerMove, true);
    document.body.removeEventListener('touchend', this.callbackOnPointerUp, true);
    document.body.removeEventListener('touchcancel', this.callbackOnPointerUp, true);
    document.body.removeEventListener('drop', this.callbackOnPointerUp, true);
    document.body.removeEventListener('contextmenu', this.callbackOnContextMenu, true);
  }
}
