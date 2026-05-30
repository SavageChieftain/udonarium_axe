import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface Lockable {
  isLock: boolean;
}

export function isLockable(obj: TabletopObject): obj is TabletopObject & Lockable {
  return typeof (obj as unknown as Partial<Lockable>).isLock === 'boolean';
}
