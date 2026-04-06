import { GridType } from '@axe/domain/tabletop/game-table';
import { hexCellCenter, hexCircumradius, hexSpacing, hexStartAngle } from '@axe/domain/tabletop/hex-geometry';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export type MovableLayerItem = {
  input?: { isGrabbing: boolean } | null;
  setPointerEvents(isEnable: boolean): void;
};

export function calcSnapNum(num: number, interval: number): number {
  if (interval <= 0) return num;
  const adjusted = num < 0 ? num - interval / 2 : num + interval / 2;
  return adjusted - (adjusted % interval);
}

export function calcHexSnapPosition(
  posX: number,
  posY: number,
  gridSize: number,
  gridType: GridType,
  halfWidth: number = gridSize / 2,
  halfHeight: number = gridSize / 2
): { x: number; y: number } {
  const isFlatTop = gridType === GridType.HEX_VERTICAL;
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);

  const colEst = posX / colSpacing;
  const rowEst = posY / rowSpacing;

  let bestX = 0;
  let bestY = 0;
  let bestDist = Infinity;

  for (let col = Math.floor(colEst) - 1; col <= Math.ceil(colEst) + 1; col++) {
    for (let row = Math.floor(rowEst) - 1; row <= Math.ceil(rowEst) + 1; row++) {
      const { x: hx, y: hy } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);

      const dx = posX - hx;
      const dy = posY - hy;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestX = hx;
        bestY = hy;
      }
    }
  }

  return { x: bestX - halfWidth, y: bestY - halfHeight };
}

export function calcHexVertexSnapPosition(
  posX: number,
  posY: number,
  gridSize: number,
  gridType: GridType,
  halfWidth: number = gridSize / 2,
  halfHeight: number = gridSize / 2
): { x: number; y: number } {
  const isFlatTop = gridType === GridType.HEX_VERTICAL;
  const s = hexCircumradius(gridSize);
  const startAngle = hexStartAngle(isFlatTop);
  const { colSpacing, rowSpacing } = hexSpacing(gridSize, isFlatTop);

  const colEst = posX / colSpacing;
  const rowEst = posY / rowSpacing;

  let bestX = 0;
  let bestY = 0;
  let bestDist = Infinity;

  for (let col = Math.floor(colEst) - 1; col <= Math.ceil(colEst) + 1; col++) {
    for (let row = Math.floor(rowEst) - 1; row <= Math.ceil(rowEst) + 1; row++) {
      const { x: cx, y: cy } = hexCellCenter(col, row, colSpacing, rowSpacing, isFlatTop);
      for (let k = 0; k < 6; k++) {
        const angle = startAngle + (k * Math.PI) / 3;
        const vx = cx + s * Math.cos(angle);
        const vy = cy + s * Math.sin(angle);
        const dx = posX - vx;
        const dy = posY - vy;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestX = vx;
          bestY = vy;
        }
      }
    }
  }

  return { x: bestX - halfWidth, y: bestY - halfHeight };
}

export function toTransformCss(posX: number, posY: number, posZ: number, transformCssOffset: string): string {
  return 'translate3d(' + posX + 'px,' + posY + 'px,' + posZ + 'px) ' + transformCssOffset;
}

export function shouldTransitionTo(
  object: TabletopObject | null | undefined,
  posX: number,
  posY: number,
  posZ: number
): boolean {
  if (!object?.location) return false;
  return object.location.x !== posX || object.location.y !== posY || object.posZ !== posZ;
}

export function collectCollidableElements(root: HTMLElement): HTMLElement[] {
  if (resolvePointerEvents(root) !== 'none') {
    return [root];
  }

  const collidableElements: HTMLElement[] = [];
  findNestedCollidableElements(root, collidableElements);
  return collidableElements;
}

function findNestedCollidableElements(element: HTMLElement, collidableElements: HTMLElement[]) {
  const children = element.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!(child instanceof HTMLElement)) continue;
    if (resolvePointerEvents(child) !== 'none') {
      collidableElements.push(child);
    }
  }

  if (collidableElements.length > 0) return;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (!(child instanceof HTMLElement)) continue;
    findNestedCollidableElements(child, collidableElements);
  }
}

function resolvePointerEvents(element: HTMLElement): string {
  return element.style.pointerEvents || getComputedStyle(element).pointerEvents;
}

export function applyPointerEvents(elements: HTMLElement[], isEnable: boolean) {
  const css = isEnable ? 'auto' : 'none';
  elements.forEach((element) => (element.style.pointerEvents = css));
}

export function setLayerCollidable(
  layerHash: { [layerName: string]: MovableLayerItem[] },
  colideLayers: string[],
  self: MovableLayerItem,
  selfIsGrabbing: boolean,
  isCollidable: boolean
) {
  for (const layerName of Object.keys(layerHash)) {
    let isEnable = isCollidable;
    if (-1 < colideLayers.indexOf(layerName)) {
      isEnable = selfIsGrabbing ? isCollidable : true;
    } else {
      isEnable = !isCollidable;
    }

    layerHash[layerName].forEach((movable) => {
      if (movable === self || movable.input?.isGrabbing) return;
      movable.setPointerEvents(isEnable);
    });
  }
}

export function registerLayer(
  layerHash: { [layerName: string]: MovableLayerItem[] },
  layerName: string,
  self: MovableLayerItem
) {
  if (!(layerName in layerHash)) layerHash[layerName] = [];
  const index = layerHash[layerName].indexOf(self);
  if (index < 0) layerHash[layerName].push(self);
}

export function unregisterLayer(
  layerHash: { [layerName: string]: MovableLayerItem[] },
  layerName: string,
  self: MovableLayerItem
) {
  if (!(layerName in layerHash)) return;
  const index = layerHash[layerName].indexOf(self);
  if (-1 < index) layerHash[layerName].splice(index, 1);
}
