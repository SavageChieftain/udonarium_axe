import { findActorAt, findTargetAt, type ReplayManifest } from '@axe/domain/replay/replay-event';
import type { ReplayNameLookup } from '@axe/features/replay/replay-log-line';

export type ReplayDictionary = Pick<ReplayManifest, 'actors' | 'targets'>;

export const EMPTY_REPLAY_DICTIONARY: ReplayDictionary = { actors: [], targets: [] };

export function replayNamesAt(dictionary: ReplayDictionary, seq: number): ReplayNameLookup {
  return {
    actorName: (userId) => findActorAt(dictionary, userId, seq)?.name || userId,
    targetName: (identifier) => findTargetAt(dictionary, identifier, seq)?.name || identifier,
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
