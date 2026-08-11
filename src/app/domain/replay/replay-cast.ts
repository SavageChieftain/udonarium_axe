import { groupReplayChildren, replayValueOfNamed } from '@axe/domain/replay/replay-data-tree';
import { syncValueOf } from '@axe/domain/replay/replay-diff';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

export interface ReplayCastMember {
  identifier: string;
  name: string;
  imageIdentifier: string;
  chatColor: string;
  /** 記録を開いた時点で盤の上に居たか。しまってあるコマと分けるために持つ。 */
  onTable: boolean;
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
      onTable: locationNameOf(snapshot) === 'table',
    });
  }
  return cast;
}

/**
 * 記念写真に写す顔ぶれ。
 *
 * 盤に出ていたコマだけを写す。しまってあるコマまで並べると、その日居なかった顔で紙が埋まる。
 * ただし盤に 1 つも出ていない記録では、写せるものが無くなるので全員を返す。
 */
export function replayCastOnTable(cast: readonly ReplayCastMember[]): ReplayCastMember[] {
  const onTable = cast.filter((member) => member.onTable);
  return onTable.length > 0 ? onTable : [...cast];
}

function locationNameOf(snapshot: ReplayObjectSnapshot): string {
  const location = syncValueOf(snapshot.syncData, 'location');
  if (!location || typeof location !== 'object') return '';
  const name = (location as Record<string, unknown>)['name'];
  return typeof name === 'string' ? name : '';
}

function firstChatColor(snapshot: ReplayObjectSnapshot): string {
  const colors = syncValueOf(snapshot.syncData, 'chatColorCode');
  return Array.isArray(colors) && typeof colors[0] === 'string' ? colors[0] : '';
}
