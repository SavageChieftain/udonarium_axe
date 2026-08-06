export type SyncData = Readonly<Record<string, unknown>>;

export interface SyncDataDiff {
  keys: readonly string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export function isSameSyncValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => isSameSyncValue(item, b[index]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => key in right && isSameSyncValue(left[key], right[key]));
}

export function cloneSyncValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null) return value;
  if (Array.isArray(value)) return value.map(cloneSyncValue) as T;

  const source = value as Record<string, unknown>;
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(source)) clone[key] = cloneSyncValue(source[key]);
  return clone as T;
}

export function cloneSyncData(data: SyncData): Record<string, unknown> {
  const clone: Record<string, unknown> = {};
  for (const key of Object.keys(data)) clone[key] = cloneSyncValue(data[key]);
  return clone;
}

export function diffSyncData(before: SyncData | null, after: SyncData): SyncDataDiff | null {
  const keys: string[] = [];
  const beforeChanged: Record<string, unknown> = {};
  const afterChanged: Record<string, unknown> = {};

  for (const key of Object.keys(after)) {
    if (before && isSameSyncValue(before[key], after[key])) continue;
    keys.push(key);
    if (before && key in before) beforeChanged[key] = cloneSyncValue(before[key]);
    afterChanged[key] = cloneSyncValue(after[key]);
  }

  if (before) {
    for (const key of Object.keys(before)) {
      if (key in after) continue;
      keys.push(key);
      beforeChanged[key] = cloneSyncValue(before[key]);
    }
  }

  if (keys.length < 1) return null;
  return { keys, before: beforeChanged, after: afterChanged };
}
