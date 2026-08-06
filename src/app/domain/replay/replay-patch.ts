import { cloneSyncValue, expandSyncPaths, flattenSyncData, type SyncData } from '@axe/domain/replay/replay-diff';
import { type ReplayEvent, ReplayEventKind, type ReplayPatch } from '@axe/domain/replay/replay-event';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

export function applyReplayPatch(syncData: SyncData | null, patch: ReplayPatch): Record<string, unknown> {
  const flat: Record<string, unknown> = syncData ? flattenSyncData(syncData) : {};
  for (const key of Object.keys(patch.after)) flat[key] = cloneSyncValue(patch.after[key]);
  for (const key of Object.keys(patch.before)) {
    if (!(key in patch.after)) delete flat[key];
  }
  return expandSyncPaths(flat);
}

export function applyReplayEvents(
  objects: readonly ReplayObjectSnapshot[],
  events: readonly ReplayEvent[]
): ReplayObjectSnapshot[] {
  const byIdentifier = new Map<string, ReplayObjectSnapshot>();
  for (const object of objects) {
    byIdentifier.set(object.identifier, { ...object, syncData: cloneSyncValue(object.syncData) });
  }

  for (const event of events) {
    if (event.kind === ReplayEventKind.ObjectRemove) {
      if (event.targetId) byIdentifier.delete(event.targetId);
      continue;
    }
    const patch = event.patch;
    if (!patch) continue;

    const current = byIdentifier.get(patch.identifier);
    byIdentifier.set(patch.identifier, {
      identifier: patch.identifier,
      aliasName: patch.aliasName || current?.aliasName || '',
      syncData: applyReplayPatch(current?.syncData ?? null, patch),
    });
  }

  return [...byIdentifier.values()];
}

export function indexOfSeq(events: readonly ReplayEvent[], seq: number): number {
  let index = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].seq > seq) break;
    index = i;
  }
  return index;
}
