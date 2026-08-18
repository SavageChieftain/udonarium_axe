import { ObjectStore } from '@axe/core/sync/object-store';
import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

type AliasName = string;

export interface Stackable extends TabletopObject {
  zindex: number;
}

function stackOf(object: Stackable, otherRelatives: AliasName[]): Stackable[] {
  const objects: Stackable[] = ObjectStore.instance.getObjects(object.aliasName);
  otherRelatives.forEach((aliasName) => objects.push(...(ObjectStore.instance.getObjects(aliasName) as Stackable[])));
  return objects.filter((obj) => obj.isVisibleOnTable);
}

export function moveToTopmost(topmost: Stackable, otherRelatives: AliasName[] = []) {
  const objects = stackOf(topmost, otherRelatives);

  let maxZindex: number = -1;
  let hasConflict: boolean = false;
  for (let i = 0; i < objects.length; i++) {
    if (maxZindex === objects[i].zindex) {
      hasConflict = true;
    } else if (maxZindex < objects[i].zindex) {
      maxZindex = objects[i].zindex;
      hasConflict = false;
    }
  }

  if (maxZindex === topmost.zindex && !hasConflict) return;
  topmost.zindex = maxZindex + 1;

  if (topmost.zindex < objects.length + 256) return;
  objects.sort((a, b) => a.zindex - b.zindex);

  for (let i = 0; i < objects.length; i++) {
    objects[i].zindex = i;
  }
}

export function moveToBottommost(bottommost: Stackable, otherRelatives: AliasName[] = []) {
  const objects = stackOf(bottommost, otherRelatives);

  let minZindex: number = Number.MAX_SAFE_INTEGER;
  let hasConflict: boolean = false;
  for (let i = 0; i < objects.length; i++) {
    if (minZindex === objects[i].zindex) {
      hasConflict = true;
    } else if (minZindex > objects[i].zindex) {
      minZindex = objects[i].zindex;
      hasConflict = false;
    }
  }

  if (minZindex === bottommost.zindex && !hasConflict) return;
  bottommost.zindex = minZindex - 1;

  if (-(objects.length + 256) < bottommost.zindex) return;
  objects.sort((a, b) => a.zindex - b.zindex);

  for (let i = 0; i < objects.length; i++) {
    objects[i].zindex = i;
  }
}
