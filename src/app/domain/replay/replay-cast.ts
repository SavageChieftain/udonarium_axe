import { syncValueOf } from '@axe/domain/replay/replay-diff';
import type { ReplayObjectSnapshot } from '@axe/domain/replay/replay-keyframe';

export interface ReplayCastMember {
  identifier: string;
  name: string;
  imageIdentifier: string;
  chatColor: string;
}

const CHARACTER_ALIAS = 'character';
const DATA_ALIAS = 'data';

export function collectReplayCast(snapshots: readonly ReplayObjectSnapshot[]): ReplayCastMember[] {
  const childrenOf = new Map<string, ReplayObjectSnapshot[]>();
  for (const snapshot of snapshots) {
    if (snapshot.aliasName !== DATA_ALIAS) continue;
    const parent = String(snapshot.syncData['parentIdentifier'] ?? '');
    if (parent.length < 1) continue;
    const siblings = childrenOf.get(parent);
    if (siblings) siblings.push(snapshot);
    else childrenOf.set(parent, [snapshot]);
  }

  const cast: ReplayCastMember[] = [];
  for (const snapshot of snapshots) {
    if (snapshot.aliasName !== CHARACTER_ALIAS) continue;
    cast.push({
      identifier: snapshot.identifier,
      name: valueOfNamed(childrenOf, snapshot.identifier, ['common', 'name']),
      imageIdentifier: valueOfNamed(childrenOf, snapshot.identifier, ['image', 'imageIdentifier']),
      chatColor: firstChatColor(snapshot),
    });
  }
  return cast;
}

function valueOfNamed(
  childrenOf: Map<string, ReplayObjectSnapshot[]>,
  rootIdentifier: string,
  path: readonly string[]
): string {
  let scope: ReplayObjectSnapshot | null = findDescendant(childrenOf, rootIdentifier, path[0]);
  for (const name of path.slice(1)) {
    if (!scope) return '';
    scope = findDescendant(childrenOf, scope.identifier, name);
  }
  return scope ? String(scope.syncData['value'] ?? '') : '';
}

function findDescendant(
  childrenOf: Map<string, ReplayObjectSnapshot[]>,
  parentIdentifier: string,
  name: string
): ReplayObjectSnapshot | null {
  const queue = [...(childrenOf.get(parentIdentifier) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (nameOf(node) === name) return node;
    queue.push(...(childrenOf.get(node.identifier) ?? []));
  }
  return null;
}

function nameOf(snapshot: ReplayObjectSnapshot): string {
  return String(syncValueOf(snapshot.syncData, 'name') ?? '');
}

function firstChatColor(snapshot: ReplayObjectSnapshot): string {
  const colors = syncValueOf(snapshot.syncData, 'chatColorCode');
  return Array.isArray(colors) && typeof colors[0] === 'string' ? colors[0] : '';
}
