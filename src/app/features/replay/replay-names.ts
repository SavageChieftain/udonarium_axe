import { type ReplayManifest, resolveSnapshotAt } from '@axe/domain/replay/replay-event';
import type { ReplayNameLookup } from '@axe/features/replay/replay-log-line';

export type ReplayDictionary = Pick<ReplayManifest, 'actors' | 'targets'>;

export const EMPTY_REPLAY_DICTIONARY: ReplayDictionary = { actors: [], targets: [] };

type Snapshots<T> = Map<string, T[]>;

interface DictionaryIndex {
  actors: Snapshots<ReplayManifest['actors'][number]>;
  targets: Snapshots<ReplayManifest['targets'][number]>;
}

/**
 * 名前の履歴を相手ごとにまとめたもの。
 *
 * ログは 1 行ごとに演者と対象の名前を引く。引くたびに履歴ぜんぶを絞り込むと、
 * 長い記録では行数 × 履歴数になって一覧を開くだけで固まる。目録ごとに 1 度作る。
 */
const indexes = new WeakMap<ReplayDictionary, DictionaryIndex>();

function groupBy<T>(rows: readonly T[], keyOf: (row: T) => string): Snapshots<T> {
  const grouped: Snapshots<T> = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

function indexOf(dictionary: ReplayDictionary): DictionaryIndex {
  const cached = indexes.get(dictionary);
  if (cached) return cached;
  const index: DictionaryIndex = {
    actors: groupBy(dictionary.actors, (actor) => actor.userId),
    targets: groupBy(dictionary.targets, (target) => target.identifier),
  };
  indexes.set(dictionary, index);
  return index;
}

export function replayNamesAt(dictionary: ReplayDictionary, seq: number): ReplayNameLookup {
  const index = indexOf(dictionary);
  return {
    actorName: (userId) => resolveSnapshotAt(index.actors.get(userId) ?? [], seq)?.name || userId,
    targetName: (identifier) => resolveSnapshotAt(index.targets.get(identifier) ?? [], seq)?.name || identifier,
  };
}

export function replayActorsOf(
  dictionary: ReplayDictionary,
  fallbackIds: readonly string[]
): { userId: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const actor of dictionary.actors) seen.set(actor.userId, actor.name || actor.userId);
  for (const userId of fallbackIds) if (!seen.has(userId)) seen.set(userId, userId);
  return [...seen].map(([userId, name]) => ({ userId, name }));
}
