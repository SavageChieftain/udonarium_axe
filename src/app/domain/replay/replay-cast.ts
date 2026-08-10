import { groupReplayChildren, replayValueOfNamed } from '@axe/domain/replay/replay-data-tree';
import { syncValueOf } from '@axe/domain/replay/replay-diff';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

export interface ReplayCastMember {
  identifier: string;
  name: string;
  imageIdentifier: string;
  chatColor: string;
}

const CHARACTER_ALIAS = 'character';

export function collectReplayCast(snapshots: readonly ReplayObjectSnapshot[]): ReplayCastMember[] {
  const childrenOf = groupReplayChildren(snapshots);

  const cast: ReplayCastMember[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.aliasName !== CHARACTER_ALIAS) continue;
    cast.push({
      identifier: snapshot.identifier,
      name: replayValueOfNamed(childrenOf, snapshot.identifier, ['common', 'name']),
      imageIdentifier: replayValueOfNamed(childrenOf, snapshot.identifier, ['image', 'imageIdentifier']),
      chatColor: firstChatColor(snapshot),
    });
  }
  return cast;
}

function firstChatColor(snapshot: ReplayObjectSnapshot): string {
  const colors = syncValueOf(snapshot.syncData, 'chatColorCode');
  return Array.isArray(colors) && typeof colors[0] === 'string' ? colors[0] : '';
}
