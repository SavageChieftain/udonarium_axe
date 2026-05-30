import { TabletopObject } from '@axe/domain/tabletop/tabletop-object';

export interface FakeTabletopObjectOptions {
  identifier?: string;
  aliasName?: string;
  locationName?: string;
  x?: number;
  y?: number;
  size?: number;
  width?: number;
  height?: number;
  isLock?: boolean;
  posZ?: number;
  clone?: () => TabletopObject;
  update?: () => void;
  setLocation?: (name: string) => void;
}

let fakeCounter = 0;

export function makeFakeTabletopObject(opts: FakeTabletopObjectOptions = {}): TabletopObject {
  fakeCounter += 1;
  const id = opts.identifier ?? `fake-${fakeCounter}`;
  const obj: Record<string, unknown> = {
    identifier: id,
    aliasName: opts.aliasName ?? 'character',
    location: { name: opts.locationName ?? 'table', x: opts.x ?? 0, y: opts.y ?? 0 },
    posZ: opts.posZ ?? 0,
  };
  if (opts.size !== undefined) obj.size = opts.size;
  if (opts.width !== undefined) obj.width = opts.width;
  if (opts.height !== undefined) obj.height = opts.height;
  if (opts.isLock !== undefined) obj.isLock = opts.isLock;
  if (opts.clone) obj.clone = opts.clone;
  if (opts.update) obj.update = opts.update;
  if (opts.setLocation) obj.setLocation = opts.setLocation;
  return obj as unknown as TabletopObject;
}

export function resetFakeTabletopObjectCounter(): void {
  fakeCounter = 0;
}
