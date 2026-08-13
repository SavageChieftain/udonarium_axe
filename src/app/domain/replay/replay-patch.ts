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

export interface ApplyReplayOptions {
  /**
   * 結果を書き換えないと約束できるとき、元の物をそのまま渡す。
   *
   * 既定では盤面まるごとを複製してから当てる。動画の書き出しのように、場面ごとの盤面を
   * 順に作って読むだけの使い方では、触られない物まで場面の数だけ複製することになる。
   */
  shareInput?: boolean;
}

export function applyReplayEvents(
  objects: readonly ReplayObjectSnapshot[],
  events: readonly ReplayEvent[],
  options?: ApplyReplayOptions
): ReplayObjectSnapshot[] {
  const share = options?.shareInput === true;
  const byIdentifier = new Map<string, ReplayObjectSnapshot>();
  for (const object of objects) {
    byIdentifier.set(object.identifier, share ? object : { ...object, syncData: cloneSyncValue(object.syncData) });
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
