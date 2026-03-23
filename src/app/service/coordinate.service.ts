import { inject, Injectable } from '@angular/core';
import { Transform } from '@axe/class/transform/transform';

import { PointerCoordinate, PointerDeviceService } from './pointer-device.service';

@Injectable({
  providedIn: 'root',
})
export class CoordinateService {
  private pointerDeviceService = inject(PointerDeviceService);

  tabletopOriginElement: HTMLElement = document.body;

  convertToLocal(pointer: PointerCoordinate, element: HTMLElement = document.body): PointerCoordinate {
    const transformer: Transform = new Transform(element);
    const ray = transformer.globalToLocal(pointer.x, pointer.y, pointer.z ? pointer.z : 0);
    transformer.clear();
    return { x: ray.x, y: ray.y, z: ray.z };
  }

  convertToGlobal(pointer: PointerCoordinate, element: HTMLElement = document.body): PointerCoordinate {
    const transformer: Transform = new Transform(element);
    const ray = transformer.localToGlobal(pointer.x, pointer.y, pointer.z ? pointer.z : 0);
    transformer.clear();
    return { x: ray.x, y: ray.y, z: ray.z };
  }

  convertLocalToLocal(pointer: PointerCoordinate, from: HTMLElement, to: HTMLElement): PointerCoordinate {
    const transformer: Transform = new Transform(from);
    const local = transformer.globalToLocal(pointer.x, pointer.y, pointer.z ? pointer.z : 0);
    const ray = transformer.localToLocal(local.x, local.y, 0, to);
    transformer.clear();
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
    if (target.contains(this.tabletopOriginElement)) {
      coordinate = this.convertToLocal(coordinate, this.tabletopOriginElement);
      coordinate.z = 0;
    } else {
      coordinate = this.convertLocalToLocal(coordinate, target, this.tabletopOriginElement);
    }
    return { x: coordinate.x, y: coordinate.y, z: 0 < coordinate.z ? coordinate.z : 0 };
  }
}
