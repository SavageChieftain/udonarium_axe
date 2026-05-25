import { inject, Injectable } from '@angular/core';
import { PointerCoordinate, PointerDeviceService } from '@axe/core/input/pointer-device.service';
import { Transform } from '@axe/core/transform/transform';

@Injectable({
  providedIn: 'root',
})
export class CoordinateService {
  private readonly pointerDeviceService = inject(PointerDeviceService);

  tabletopOriginElement: HTMLElement = document.body;

  // pointermove 毎に Transform を new し続けると Matrix3D ×3 + getComputedStyle 連鎖で GC 圧が掛かる。
  // service スコープで使い回す 2 つのインスタンスを reinit して使う。
  private readonly _transformA: Transform = new Transform(document.body);
  private readonly _transformB: Transform = new Transform(document.body);

  convertToLocal(pointer: PointerCoordinate, element: HTMLElement = document.body): PointerCoordinate {
    const transformer = this._transformA.reinit(element);
    const ray = transformer.globalToLocal(pointer.x, pointer.y, pointer.z ?? 0);
    transformer.clear();
    return { x: ray.x, y: ray.y, z: ray.z };
  }

  convertToGlobal(pointer: PointerCoordinate, element: HTMLElement = document.body): PointerCoordinate {
    const transformer = this._transformA.reinit(element);
    const ray = transformer.localToGlobal(pointer.x, pointer.y, pointer.z ?? 0);
    transformer.clear();
    return { x: ray.x, y: ray.y, z: ray.z };
  }

  convertLocalToLocal(pointer: PointerCoordinate, from: HTMLElement, to: HTMLElement): PointerCoordinate {
    const fromTransform = this._transformA.reinit(from);
    const local = fromTransform.globalToLocal(pointer.x, pointer.y, pointer.z ?? 0);
    const toTransform = this._transformB.reinit(to);
    const ray = fromTransform.localToLocalUsing(local.x, local.y, 0, toTransform);
    fromTransform.clear();
    toTransform.clear();
    return { x: ray.x, y: ray.y, z: ray.z };
  }

  calcTabletopLocalCoordinate(
    coordinate: PointerCoordinate = {
      x: this.pointerDeviceService.pointers[0].x,
      y: this.pointerDeviceService.pointers[0].y,
      z: 0,
    },
    target: HTMLElement = this.pointerDeviceService.targetElement
  ): PointerCoordinate {
    const local = target.contains(this.tabletopOriginElement)
      ? { ...this.convertToLocal(coordinate, this.tabletopOriginElement), z: 0 }
      : this.convertLocalToLocal(coordinate, target, this.tabletopOriginElement);
    return { x: local.x, y: local.y, z: Math.max(0, local.z) };
  }
}
